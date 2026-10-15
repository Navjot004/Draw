import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from app.database.session import Base

class Organizer(Base):
    __tablename__ = "organizers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="organizer", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationship to draws
    draws = relationship("Draw", back_populates="organizer", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Organizer id={self.id} email={self.email} role={self.role}>"
