from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class MeetingCreate(BaseModel):
    title: str
    participants: List[str]
    duration_minutes: int = 30
    preferred_date: Optional[str] = None  # YYYY-MM-DD


class MeetingResponse(BaseModel):
    id: int
    title: str
    participants: str
    meeting_date: Optional[str] = None
    meeting_time: Optional[str] = None
    duration_minutes: int
    calendar_event_id: Optional[str] = None
    meet_link: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
