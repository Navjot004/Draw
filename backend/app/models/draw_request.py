from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.session import Base

class DrawRequest(Base):
    """
    Idempotency registry to prevent duplicate draws caused by double clicks,
    network retries, or concurrent requests.
    """
    __tablename__ = "draw_requests"

    idempotency_key = Column(String(128), primary_key=True)
    draw_id = Column(String(36), ForeignKey("draws.id", ondelete="CASCADE"), nullable=True, index=True)
    status = Column(String(50), default="processed", nullable=False)  # pending, processed, failed
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    draw = relationship("Draw", back_populates="requests")

    def __repr__(self):
        return f"<DrawRequest key={self.idempotency_key} draw_id={self.draw_id} status={self.status}>"
