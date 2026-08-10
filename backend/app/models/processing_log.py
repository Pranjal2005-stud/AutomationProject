from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.database.base import Base


class ProcessingLog(Base):
    __tablename__ = "processing_logs"

    id = Column(Integer, primary_key=True, index=True)
    module = Column(String(100), nullable=False)
    action = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False)  # success | failed | warning
    details = Column(Text, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
