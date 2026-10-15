from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.students import router as students_router
from app.api.draws import router as draws_router
from app.api.health import router as health_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(students_router)
api_router.include_router(draws_router)
api_router.include_router(health_router)
