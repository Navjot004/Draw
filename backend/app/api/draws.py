import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database.session import get_db
from app.api.deps import get_current_organizer
from app.models.organizer import Organizer
from app.models.draw import Draw
from app.services.draw_service import DrawService
from app.schemas.draw import DrawCreateRequest, DrawResponse, DrawHistoryResponse, DrawHistoryItem

router = APIRouter(prefix="/draws", tags=["Draws"])

@router.post("", response_model=DrawResponse, status_code=status.HTTP_201_CREATED)
def create_draw(
    body: DrawCreateRequest,
    db: Session = Depends(get_db),
    current_organizer: Organizer = Depends(get_current_organizer)
):
    """
    Execute a random winner draw:
    - Cryptographically fair selection via secrets.choice()
    - Idempotent: duplicate requests return identical existing draw
    - Persists draw before returning to frontend
    """
    draw = DrawService.execute_draw(
        db=db,
        organizer=current_organizer,
        idempotency_key=body.idempotency_key
    )

    return DrawResponse(
        id=draw.id,
        winner_name=draw.winner_name,
        winner_reg_no=draw.winner_reg_no,
        participant_count=draw.participant_count,
        pool_hash=draw.pool_hash,
        status=draw.status,
        created_at=draw.created_at,
        organizer_email=current_organizer.email,
        organizer_id=str(draw.organizer_id)
    )

@router.get("/history", response_model=DrawHistoryResponse)
def get_draw_history(
    q: Optional[str] = Query(None, description="Search by winner name or reg number"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_organizer: Organizer = Depends(get_current_organizer)
):
    """
    Retrieve paginated history of all completed draws with audit information.
    """
    query = db.query(Draw).join(Organizer, Draw.organizer_id == Organizer.id, isouter=True)

    if q and q.strip():
        search_term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Draw.winner_name.ilike(search_term),
                Draw.winner_reg_no.ilike(search_term),
                Draw.id.ilike(search_term)
            )
        )

    total = query.count()
    offset = (page - 1) * limit
    draws = query.order_by(Draw.created_at.desc()).offset(offset).limit(limit).all()

    items = []
    for d in draws:
        items.append(
            DrawHistoryItem(
                id=d.id,
                winner_name=d.winner_name,
                winner_reg_no=d.winner_reg_no,
                participant_count=d.participant_count,
                pool_hash=d.pool_hash,
                status=d.status,
                created_at=d.created_at,
                organizer_email=d.organizer.email if d.organizer else "Unknown"
            )
        )

    pages = math.ceil(total / limit) if total > 0 else 1

    return DrawHistoryResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages
    )

@router.get("/{draw_id}", response_model=DrawResponse)
def get_draw(
    draw_id: str,
    db: Session = Depends(get_db),
    current_organizer: Organizer = Depends(get_current_organizer)
):
    """
    Retrieve specific saved draw details.
    Allows replaying the reveal animation or recovering after a browser refresh.
    """
    draw = DrawService.get_draw_by_id(db, draw_id)
    if not draw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draw record not found."
        )

    return DrawResponse(
        id=draw.id,
        winner_name=draw.winner_name,
        winner_reg_no=draw.winner_reg_no,
        participant_count=draw.participant_count,
        pool_hash=draw.pool_hash,
        status=draw.status,
        created_at=draw.created_at,
        organizer_email=draw.organizer.email if draw.organizer else "Unknown",
        organizer_id=str(draw.organizer_id)
    )
