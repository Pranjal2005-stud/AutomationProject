from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.base import Base


class Email(Base):
    __tablename__ = "emails"

    id = Column(Integer, primary_key=True, index=True)
    gmail_message_id = Column(String(255), unique=True, nullable=True, index=True)
    thread_id = Column(String(255), nullable=True)
    sender_name = Column(String(255), nullable=True)
    sender_email = Column(String(255), nullable=False)
    receiver_email = Column(String(255), nullable=True)
    subject = Column(String(500), nullable=True)
    body = Column(Text, nullable=True)
    received_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default="Pending", nullable=False)
    ticket_created = Column(Boolean, default=False, nullable=False)
    jira_issue_key = Column(String(100), nullable=True)
    priority = Column(String(50), nullable=True)
    category = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    jira_tickets = relationship("JiraTicket", back_populates="email", cascade="all, delete-orphan")
