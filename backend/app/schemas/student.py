from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Dict, Any

class StudentRecord(BaseModel):
    name: str = Field(..., description="Student full name")
    reg_no: str = Field(..., description="Registration number preserving leading zeros")

class StudentInvalidRecord(BaseModel):
    raw_name: Optional[str] = None
    raw_reg_no: Optional[str] = None
    reason: str

class StudentDuplicateRecord(BaseModel):
    reg_no: str
    occurrences: int
    names: List[str]

class StudentSummaryResponse(BaseModel):
    total_fetched: int
    eligible_count: int
    invalid_count: int
    duplicate_count: int
    pool_hash: str
    source: str
    is_confirmed: bool
    last_synced: Optional[datetime] = None
    sample_eligible: List[StudentRecord] = []
    sample_invalid: List[StudentInvalidRecord] = []
    sample_duplicates: List[StudentDuplicateRecord] = []

class StudentStatusResponse(BaseModel):
    is_ready: bool
    total_eligible: int
    pool_hash: str
    source: str
    is_confirmed: bool
    last_synced: Optional[datetime] = None
    google_sheet_configured: bool
    file_name: Optional[str] = None
    source_label: Optional[str] = None

class ConfirmPoolRequest(BaseModel):
    confirmed: bool = True
