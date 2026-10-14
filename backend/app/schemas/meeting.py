from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class MeetingCreate(BaseModel):
    title: str
    participants: List[str] = []
    team_ids: List[int] = []
    duration_minutes: int = 30
    preferred_date: Optional[str] = None  # YYYY-MM-DD


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    participants: Optional[List[str]] = None
    team_ids: Optional[List[int]] = None
    preferred_date: Optional[str] = None
    duration_minutes: Optional[int] = None


class MeetingResponse(BaseModel):
    id: int
    title: str
    participants: str
    team_names: Optional[str] = None
    meeting_date: Optional[str] = None
    meeting_time: Optional[str] = None
    duration_minutes: int
    calendar_event_id: Optional[str] = None
    meet_link: Optional[str] = None
    calendar_link: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UpcomingMeetingAttendee(BaseModel):
    email: str
    name: Optional[str] = None


class UpcomingMeetingResponse(BaseModel):
    id: int
    title: str
    meeting_date: Optional[str] = None
    meeting_time: Optional[str] = None
    duration_minutes: int
    team_names: Optional[str] = None
    attendees: List[UpcomingMeetingAttendee] = []
    meet_link: Optional[str] = None
    calendar_link: Optional[str] = None
    calendar_event_id: Optional[str] = None
    status: str
