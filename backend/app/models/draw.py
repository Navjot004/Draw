import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.session import Base

class Draw(Base):
    __tablename__ = "draws"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organizer_id = Column(String(36), ForeignKey("organizers.id", ondelete="SET NULL"), nullable=True, index=True)
    winner_name = Column(String(255), nullable=False, index=True)
    winner_reg_no = Column(String(100), nullable=False, index=True)  # String preserves leading zeros e.g. "00492"
    participant_count = Column(Integer, nullable=False)
    pool_hash = Column(String(64), nullable=False, index=True)  # SHA-256 hash of participant pool
    status = Column(String(50), default="completed", nullable=False)  # completed, voided
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    organizer = relationship("Organizer", back_populates="draws")
    requests = relationship("DrawRequest", back_populates="draw", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Draw id={self.id} winner={self.winner_name} ({self.winner_reg_no})>"
