import json
import logging
import random
from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_organizer
from app.models.organizer import Organizer
from app.models.student_pool import StudentPoolSnapshot
from app.services.sheets_service import SheetsService
from app.services.excel_service import ExcelService
from app.services.student_validator import validate_student_records
from app.schemas.student import (
    StudentStatusResponse,
    StudentSummaryResponse,
    ConfirmPoolRequest,
    StudentRecord,
    StudentInvalidRecord,
    StudentDuplicateRecord
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("/status", response_model=StudentStatusResponse)
def get_students_status(
    db: Session = Depends(get_db),
    current_organizer: Organizer = Depends(get_current_organizer)
):
    """
    Get current participant pool status.
    """
    pool = (
        db.query(StudentPoolSnapshot)
        .filter(StudentPoolSnapshot.is_active == True)
        .order_by(StudentPoolSnapshot.id.desc())
        .first()
    )

    if not pool:
        return StudentStatusResponse(
            is_ready=False,
            total_eligible=0,
            pool_hash="",
            source="none",
            is_confirmed=False,
            last_synced=None,
            google_sheet_configured=SheetsService.is_google_sheets_configured(),
            file_name=None,
            source_label="No Data Loaded"
        )

    file_name = None
    if pool.source.startswith("excel:"):
        file_name = pool.source.split("excel:", 1)[1]
        source_label = f"Excel ({file_name})"
    elif pool.source.startswith("csv:"):
        file_name = pool.source.split("csv:", 1)[1]
        source_label = f"CSV ({file_name})"
    elif pool.source == "google_sheets":
        source_label = "Google Sheets API"
    elif "demo" in pool.source:
        source_label = "Demo Dataset (6,000+)"
    else:
        source_label = pool.source

    return StudentStatusResponse(
        is_ready=pool.is_confirmed and pool.eligible_count > 0,
        total_eligible=pool.eligible_count,
        pool_hash=pool.pool_hash,
        source=pool.source,
        is_confirmed=pool.is_confirmed,
        last_synced=pool.synced_at,
        google_sheet_configured=SheetsService.is_google_sheets_configured(),
        file_name=file_name,
        source_label=source_label
    )

@router.post("/sync", response_model=StudentSummaryResponse)
def sync_students(
    db: Session = Depends(get_db),
    current_organizer: Organizer = Depends(get_current_organizer)
):
    """
    Fetch students from Google Sheets (or demo data if unconfigured),
    execute rigorous data validation, store new participant pool snapshot,
    and return validation summary.
    """
    raw_records, source, error_msg = SheetsService.fetch_students_raw()
    
    # Run validation
    validation = validate_student_records(raw_records)

    # Deactivate previous active pools
    db.query(StudentPoolSnapshot).filter(StudentPoolSnapshot.is_active == True).update({"is_active": False})

    # Prepare summary JSON
    summary_meta = {
        "error_message": error_msg,
        "sample_invalid": validation.invalid[:25],
        "sample_duplicates": validation.duplicates[:25],
    }

    # Auto-confirm demo pool if it has valid students so organizers can immediately test, but require explicit re-confirmation for sheet syncs if desired
    # For demo mode: auto-confirm = True to let users draw right away, while still allowing manual confirmation
    is_auto_confirmed = True

    new_pool = StudentPoolSnapshot(
        source=source,
        total_fetched=validation.total_fetched,
        eligible_count=validation.eligible_count,
        invalid_count=validation.invalid_count,
        duplicate_count=validation.duplicate_count,
        pool_hash=validation.pool_hash,
        is_active=True,
        is_confirmed=is_auto_confirmed,
        students_data=json.dumps(validation.eligible),
        validation_summary=json.dumps(summary_meta),
        synced_at=datetime.now(timezone.utc)
    )
    db.add(new_pool)
    db.commit()
    db.refresh(new_pool)

    return StudentSummaryResponse(
        total_fetched=new_pool.total_fetched,
        eligible_count=new_pool.eligible_count,
        invalid_count=new_pool.invalid_count,
        duplicate_count=new_pool.duplicate_count,
        pool_hash=new_pool.pool_hash,
        source=new_pool.source,
        is_confirmed=new_pool.is_confirmed,
        last_synced=new_pool.synced_at,
        sample_eligible=[StudentRecord(**s) for s in validation.eligible[:20]],
        sample_invalid=[StudentInvalidRecord(**inv) for inv in validation.invalid[:20]],
        sample_duplicates=[StudentDuplicateRecord(**dup) for dup in validation.duplicates[:20]]
    )

@router.post("/upload", response_model=StudentSummaryResponse)
async def upload_participant_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_organizer: Organizer = Depends(get_current_organizer)
):
    """
    Directly upload an Excel (.xlsx) or CSV file with participant names and roll numbers.
    Parses rows, validates records, removes duplicates, deterministically computes pool hash,
    and activates the new participant pool.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected. Please select an Excel or CSV file.")

    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum supported size is 25MB.")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    raw_records, error_msg = ExcelService.parse_file(content, file.filename)
    if error_msg and not raw_records:
        raise HTTPException(status_code=400, detail=error_msg)

    # Validate records
    validation = validate_student_records(raw_records)

    if validation.eligible_count == 0:
        raise HTTPException(
            status_code=400,
            detail=f"No eligible participants found in '{file.filename}'. Found {validation.invalid_count} invalid rows and {validation.duplicate_count} duplicate records."
        )

    # Deactivate previous active pools
    db.query(StudentPoolSnapshot).filter(StudentPoolSnapshot.is_active == True).update({"is_active": False})

    summary_meta = {
        "error_message": error_msg,
        "sample_invalid": validation.invalid[:25],
        "sample_duplicates": validation.duplicates[:25],
        "filename": file.filename,
    }

    prefix = "excel" if file.filename.lower().endswith(".xlsx") else "csv"
    source = f"{prefix}:{file.filename}"

    new_pool = StudentPoolSnapshot(
        source=source,
        total_fetched=validation.total_fetched,
        eligible_count=validation.eligible_count,
        invalid_count=validation.invalid_count,
        duplicate_count=validation.duplicate_count,
        pool_hash=validation.pool_hash,
        is_active=True,
        is_confirmed=True,
        students_data=json.dumps(validation.eligible),
        validation_summary=json.dumps(summary_meta),
        synced_at=datetime.now(timezone.utc)
    )
    db.add(new_pool)
    db.commit()
    db.refresh(new_pool)

    return StudentSummaryResponse(
        total_fetched=new_pool.total_fetched,
        eligible_count=new_pool.eligible_count,
        invalid_count=new_pool.invalid_count,
        duplicate_count=new_pool.duplicate_count,
        pool_hash=new_pool.pool_hash,
        source=new_pool.source,
        is_confirmed=new_pool.is_confirmed,
        last_synced=new_pool.synced_at,
        sample_eligible=[StudentRecord(**s) for s in validation.eligible[:20]],
        sample_invalid=[StudentInvalidRecord(**inv) for inv in validation.invalid[:20]],
        sample_duplicates=[StudentDuplicateRecord(**dup) for dup in validation.duplicates[:20]]
    )

@router.get("/template")
def download_sample_template(
    current_organizer: Organizer = Depends(get_current_organizer)
):
    """
    Download an Excel (.xlsx) template preformatted for participant uploads.
    """
    import io
    import openpyxl

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Participants"
    ws.append(["Participant Name", "Registration Number"])
    ws.append(["Aarav Sharma", "REG-2026-001"])
    ws.append(["Diya Patel", "REG-2026-002"])
    ws.append(["Kabir Singh", "REG-2026-003"])
    ws.append(["Priya Verma", "REG-2026-004"])
    ws.append(["Rohan Mehta", "REG-2026-005"])
    ws.column_dimensions["A"].width = 28
    ws.column_dimensions["B"].width = 24

    out = io.BytesIO()
    wb.save(out)
    out.seek(0)

    return Response(
        content=out.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=participants_template.xlsx"}
    )

@router.post("/reset-demo", response_model=StudentSummaryResponse)
def reset_to_demo_pool(
    db: Session = Depends(get_db),
    current_organizer: Organizer = Depends(get_current_organizer)
):
    """
    Reset active pool to the 6,000+ demo participant dataset.
    """
    from app.services.demo_data import generate_demo_students
    demo_data = generate_demo_students(6250)
    validation = validate_student_records(demo_data)

    db.query(StudentPoolSnapshot).filter(StudentPoolSnapshot.is_active == True).update({"is_active": False})

    summary_meta = {
        "error_message": None,
        "sample_invalid": validation.invalid[:25],
        "sample_duplicates": validation.duplicates[:25],
    }

    new_pool = StudentPoolSnapshot(
        source="demo_mode",
        total_fetched=validation.total_fetched,
        eligible_count=validation.eligible_count,
        invalid_count=validation.invalid_count,
        duplicate_count=validation.duplicate_count,
        pool_hash=validation.pool_hash,
        is_active=True,
        is_confirmed=True,
        students_data=json.dumps(validation.eligible),
        validation_summary=json.dumps(summary_meta),
        synced_at=datetime.now(timezone.utc)
    )
    db.add(new_pool)
    db.commit()
    db.refresh(new_pool)

    return StudentSummaryResponse(
        total_fetched=new_pool.total_fetched,
        eligible_count=new_pool.eligible_count,
        invalid_count=new_pool.invalid_count,
        duplicate_count=new_pool.duplicate_count,
        pool_hash=new_pool.pool_hash,
        source=new_pool.source,
        is_confirmed=new_pool.is_confirmed,
        last_synced=new_pool.synced_at,
        sample_eligible=[StudentRecord(**s) for s in validation.eligible[:20]],
        sample_invalid=[StudentInvalidRecord(**inv) for inv in validation.invalid[:20]],
        sample_duplicates=[StudentDuplicateRecord(**dup) for dup in validation.duplicates[:20]]
    )

@router.get("/summary", response_model=StudentSummaryResponse)
def get_student_summary(
    db: Session = Depends(get_db),
    current_organizer: Organizer = Depends(get_current_organizer)
):
    """
    Get detailed summary of the current participant pool.
    """
    pool = (
        db.query(StudentPoolSnapshot)
        .filter(StudentPoolSnapshot.is_active == True)
        .order_by(StudentPoolSnapshot.id.desc())
        .first()
    )

    if not pool:
        # Trigger automatic initial sync
        return sync_students(db, current_organizer)

    eligible = json.loads(pool.students_data)
    summary_meta = json.loads(pool.validation_summary or "{}")

    return StudentSummaryResponse(
        total_fetched=pool.total_fetched,
        eligible_count=pool.eligible_count,
        invalid_count=pool.invalid_count,
        duplicate_count=pool.duplicate_count,
        pool_hash=pool.pool_hash,
        source=pool.source,
        is_confirmed=pool.is_confirmed,
        last_synced=pool.synced_at,
        sample_eligible=[StudentRecord(**s) for s in eligible[:20]],
        sample_invalid=[StudentInvalidRecord(**inv) for inv in summary_meta.get("sample_invalid", [])[:20]],
        sample_duplicates=[StudentDuplicateRecord(**dup) for dup in summary_meta.get("sample_duplicates", [])[:20]]
    )

@router.post("/confirm")
def confirm_participant_pool(
    body: ConfirmPoolRequest,
    db: Session = Depends(get_db),
    current_organizer: Organizer = Depends(get_current_organizer)
):
    """
    Organizer confirms the eligible participant pool before starting a draw.
    """
    pool = (
        db.query(StudentPoolSnapshot)
        .filter(StudentPoolSnapshot.is_active == True)
        .order_by(StudentPoolSnapshot.id.desc())
        .first()
    )
    if not pool:
        raise HTTPException(status_code=400, detail="No active student pool to confirm.")

    pool.is_confirmed = body.confirmed
    db.commit()
    return {"message": "Participant pool confirmed successfully", "is_confirmed": pool.is_confirmed}

@router.get("/sample-pool", response_model=List[StudentRecord])
def get_shuffle_sample_pool(
    db: Session = Depends(get_db),
    current_organizer: Organizer = Depends(get_current_organizer)
):
    """
    Provides a small random sample of 60 eligible names from the pool
    for smooth client-side animation during the rapid name shuffle.
    This avoids shipping 6,000+ DOM nodes while providing authentic names.
    """
    pool = (
        db.query(StudentPoolSnapshot)
        .filter(StudentPoolSnapshot.is_active == True)
        .order_by(StudentPoolSnapshot.id.desc())
        .first()
    )
    if not pool:
        return []

    eligible = json.loads(pool.students_data)
    # Return 60 sample students shuffled
    sample_size = min(len(eligible), 60)
    samples = random.sample(eligible, sample_size)
    return [StudentRecord(**s) for s in samples]
