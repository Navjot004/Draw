from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    PROJECT_NAME: str = "Mystery Name Shuffle"
    API_V1_PREFIX: str = "/api"
    
    # Security
    SECRET_KEY: str = "super-secret-mystery-shuffle-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours
    COOKIE_NAME: str = "mystery_auth_token"
    
    # Database (PostgreSQL URL or SQLite fallback)
    DATABASE_URL: str = "sqlite:///./mystery_draw.db"
    
    # Google Sheets Configuration
    GOOGLE_SHEET_ID: Optional[str] = None
    GOOGLE_SHEET_RANGE: str = "Sheet1!A:B"
    GOOGLE_SERVICE_ACCOUNT_FILE: Optional[str] = None
    GOOGLE_SERVICE_ACCOUNT_INFO: Optional[str] = None
    
    # Demo Mode Config
    DEMO_STUDENTS_COUNT: int = 6250
    FORCE_DEMO_MODE: bool = False
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
    ]

settings = Settings()
