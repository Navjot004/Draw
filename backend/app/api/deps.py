from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.config import settings
from app.core.security import decode_access_token
from app.models.organizer import Organizer

security_scheme = HTTPBearer(auto_error=False)

def get_current_organizer(
    request: Request,
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> Organizer:
    """
    Extracts and authenticates organizer from either:
    1. Authorization: Bearer <token> header, OR
    2. HTTP-only cookie (settings.COOKIE_NAME)
    """
    token = None
    if auth_header and auth_header.credentials:
        token = auth_header.credentials
    else:
        token = request.cookies.get(settings.COOKIE_NAME)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    organizer_id: str = payload.get("sub")
    if not organizer_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload."
        )

    organizer = db.query(Organizer).filter(Organizer.id == organizer_id).first()
    if not organizer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Organizer account not found."
        )

    return organizer
