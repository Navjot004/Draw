from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import verify_password, create_access_token
from app.core.rate_limiter import login_rate_limiter
from app.core.config import settings
from app.models.organizer import Organizer
from app.schemas.auth import LoginRequest, TokenResponse, OrganizerResponse
from app.api.deps import get_current_organizer

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate an organizer with email & password.
    Rate limited to prevent brute force.
    Sets secure HTTP-only cookie and returns JWT token.
    """
    # 1. Enforce rate limiting based on client IP
    client_ip = request.client.host if request.client else "unknown"
    rate_limit_key = f"login:{client_ip}:{body.email.lower()}"
    login_rate_limiter.enforce(rate_limit_key)

    # 2. Find organizer
    organizer = db.query(Organizer).filter(Organizer.email == body.email.lower().strip()).first()
    if not organizer or not verify_password(body.password, organizer.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # 3. Create token
    access_token = create_access_token(data={"sub": str(organizer.id), "email": organizer.email, "role": organizer.role})

    # 4. Set HTTP-only cookie
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False  # Set True in strict HTTPS production
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        organizer=OrganizerResponse.model_validate(organizer)
    )

@router.post("/logout")
def logout(response: Response):
    """Clear session cookie upon logout."""
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        httponly=True,
        samesite="lax"
    )
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=OrganizerResponse)
def get_current_user_profile(
    current_organizer: Organizer = Depends(get_current_organizer)
):
    """Get authenticated organizer's profile."""
    return OrganizerResponse.model_validate(current_organizer)
