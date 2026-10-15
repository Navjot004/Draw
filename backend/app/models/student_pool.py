from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from app.database.session import Base

class StudentPoolSnapshot(Base):
    """
    Stores snapshots of validated student participant pools.
    """
    __tablename__ = "student_pool_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(String(50), nullable=False)  # google_sheets, demo_mode
    total_fetched = Column(Integer, nullable=False, default=0)
    eligible_count = Column(Integer, nullable=False, default=0)
    invalid_count = Column(Integer, nullable=False, default=0)
    duplicate_count = Column(Integer, nullable=False, default=0)
    pool_hash = Column(String(64), nullable=False, index=True)
    is_active = Column(Boolean, default=True, index=True)
    is_confirmed = Column(Boolean, default=False)
    students_data = Column(Text, nullable=False)  # JSON-encoded eligible students list
    validation_summary = Column(Text, nullable=True)  # JSON-encoded invalid/duplicate details
    synced_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self):
        return f"<StudentPoolSnapshot id={self.id} source={self.source} eligible={self.eligible_count} hash={self.pool_hash[:8]}>"
