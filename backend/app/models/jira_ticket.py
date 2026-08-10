from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.base import Base


class JiraTicket(Base):
    __tablename__ = "jira_tickets"

    id = Column(Integer, primary_key=True, index=True)
    jira_key = Column(String(100), unique=True, nullable=True, index=True)
    summary = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String(50), default="Medium")
    issue_type = Column(String(100), default="Task")
    status = Column(String(50), default="Open")
    email_id = Column(Integer, ForeignKey("emails.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    email = relationship("Email", back_populates="jira_tickets")
