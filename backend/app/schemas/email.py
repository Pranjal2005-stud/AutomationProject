from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class EmailCreate(BaseModel):
    sender_name: Optional[str] = None
    sender_email: str
    receiver_email: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None


class EmailUpdate(BaseModel):
    status: Optional[str] = None
    ticket_created: Optional[bool] = None
    jira_issue_key: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None


class EmailResponse(BaseModel):
    id: int
    gmail_message_id: Optional[str] = None
    sender_name: Optional[str] = None
    sender_email: str
    receiver_email: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    status: str
    ticket_created: bool
    jira_issue_key: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    received_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
