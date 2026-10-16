from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.database.base import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    participants = Column(Text, nullable=False)  # JSON-encoded list of emails
    team_names = Column(Text, nullable=True)      # JSON-encoded list of team names
    meeting_date = Column(String(20), nullable=True)
    meeting_time = Column(String(20), nullable=True)
    duration_minutes = Column(Integer, default=30)
    calendar_event_id = Column(String(255), nullable=True, unique=True)
    meet_link = Column(String(500), nullable=True)
    calendar_link = Column(String(500), nullable=True)
    status = Column(String(50), default="Scheduled")
    notes = Column(Text, nullable=True)
    notes_jira_comment_id = Column(String(255), nullable=True)
    notes_jira_key = Column(String(100), nullable=True)
    notes_jira_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
