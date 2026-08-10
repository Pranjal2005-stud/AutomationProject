from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class JiraTicketCreate(BaseModel):
    summary: str
    description: Optional[str] = None
    priority: str = "Medium"
    issue_type: str = "Task"
    email_id: Optional[int] = None


class JiraTicketResponse(BaseModel):
    id: int
    jira_key: Optional[str] = None
    summary: str
    description: Optional[str] = None
    priority: str
    issue_type: str
    status: str
    email_id: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
