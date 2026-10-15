import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.session import init_db, SessionLocal
from app.api import api_router
from app.models.organizer import Organizer
from app.core.security import hash_password

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("mystery_draw")

def seed_initial_organizer():
    """Ensure at least one administrative organizer exists."""
    db = SessionLocal()
    try:
        existing = db.query(Organizer).first()
        if not existing:
            default_email = "admin@collegedraw.edu"
            default_pass = "Admin@Mystery2026"
            admin = Organizer(
                email=default_email,
                password_hash=hash_password(default_pass),
                role="admin"
            )
            db.add(admin)
            db.commit()
            logger.info(f"Initialized default organizer account: {default_email} (Password: {default_pass})")
    except Exception as e:
        logger.error(f"Error seeding default organizer: {e}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables and default organizer on startup
    logger.info("Initializing Mystery Name Shuffle database tables...")
    init_db()
    seed_initial_organizer()
    yield
    logger.info("Shutting down Mystery Name Shuffle backend...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Student Winner Selection System for College Events",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "docs": "/docs",
        "api": "/api"
    }
