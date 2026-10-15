import json
import secrets
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.draw import Draw
from app.models.draw_request import DrawRequest
from app.models.student_pool import StudentPoolSnapshot
from app.models.organizer import Organizer

logger = logging.getLogger(__name__)

class DrawService:
    @staticmethod
    def get_active_pool(db: Session) -> Optional[StudentPoolSnapshot]:
        """Fetch the most recent active student pool snapshot."""
        return (
            db.query(StudentPoolSnapshot)
            .filter(StudentPoolSnapshot.is_active == True)
            .order_by(StudentPoolSnapshot.id.desc())
            .first()
        )

    @staticmethod
    def execute_draw(
        db: Session,
        organizer: Organizer,
        idempotency_key: str
    ) -> Draw:
        """
        Executes a cryptographically secure random winner draw:
        1. Checks idempotency key to prevent duplicate draws.
        2. Validates active participant pool.
        3. Uses Python secrets.choice() to select one uniform random winner.
        4. Persists the draw and idempotency record transactionally.
        """
        # 1. Check idempotency key first
        existing_request = (
            db.query(DrawRequest)
            .filter(DrawRequest.idempotency_key == idempotency_key)
            .first()
        )
        if existing_request:
            if existing_request.draw_id:
                existing_draw = db.query(Draw).filter(Draw.id == existing_request.draw_id).first()
                if existing_draw:
                    logger.info(f"Idempotent request {idempotency_key} returning existing draw {existing_draw.id}")
                    return existing_draw
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A draw request with this idempotency key is already pending or failed."
            )

        # 2. Check participant pool
        pool = DrawService.get_active_pool(db)
        if not pool:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No participant pool found. Please synchronize student data first."
            )

        if not pool.is_confirmed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Participant pool has not been confirmed by the organizer. Please review and confirm before drawing."
            )

        try:
            eligible_students = json.loads(pool.students_data)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to parse participant pool data."
            )

        if not eligible_students:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The eligible participant pool is empty. Cannot perform draw."
            )

        # 3. Cryptographically secure random selection using Python's secrets.choice()
        winner = secrets.choice(eligible_students)
        winner_name = winner["name"]
        winner_reg_no = winner["reg_no"]
        participant_count = len(eligible_students)
        pool_hash = pool.pool_hash

        # 4. Save Draw and DrawRequest transactionally
        draw = Draw(
            organizer_id=organizer.id,
            winner_name=winner_name,
            winner_reg_no=winner_reg_no,
            participant_count=participant_count,
            pool_hash=pool_hash,
            status="completed",
            created_at=datetime.now(timezone.utc)
        )
        db.add(draw)
        db.flush()  # assign draw.id

        draw_request = DrawRequest(
            idempotency_key=idempotency_key,
            draw_id=draw.id,
            status="processed",
            created_at=datetime.now(timezone.utc)
        )
        db.add(draw_request)
        db.commit()
        db.refresh(draw)

        logger.info(
            f"Draw {draw.id} successfully completed. Winner: {winner_name} ({winner_reg_no}) "
            f"from {participant_count} participants. Organizer: {organizer.email}"
        )
        return draw

    @staticmethod
    def get_draw_by_id(db: Session, draw_id: str) -> Optional[Draw]:
        return db.query(Draw).filter(Draw.id == draw_id).first()
