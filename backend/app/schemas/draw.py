from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import List, Optional

class DrawCreateRequest(BaseModel):
    idempotency_key: str = Field(..., description="Unique client-generated key to prevent duplicate draws")

class DrawResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    winner_name: str
    winner_reg_no: str
    participant_count: int
    pool_hash: str
    status: str
    created_at: datetime
    organizer_email: Optional[str] = None
    organizer_id: Optional[str] = None

class DrawHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    winner_name: str
    winner_reg_no: str
    participant_count: int
    pool_hash: str
    status: str
    created_at: datetime
    organizer_email: Optional[str] = None

class DrawHistoryResponse(BaseModel):
    items: List[DrawHistoryItem]
    total: int
    page: int
    limit: int
    pages: int
