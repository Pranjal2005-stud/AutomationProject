import json
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundException
from app.database.session import get_db
from app.models.meeting import Meeting
from app.repositories.log_repository import MeetingRepository
from app.schemas.meeting import MeetingCreate, MeetingResponse
from app.services.calendar_service import calendar_service

router = APIRouter(prefix="/meetings", tags=["Meetings"])


@router.get("/", response_model=List[MeetingResponse])
def list_meetings(status: str = None, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    repo = MeetingRepository(db)
    if status:
        return db.query(Meeting).filter(Meeting.status == status).offset(skip).limit(limit).all()
    return repo.get_all(skip, limit)


@router.post("/", response_model=MeetingResponse, status_code=201)
def schedule_meeting(payload: MeetingCreate, db: Session = Depends(get_db)):
    repo = MeetingRepository(db)
    slot = calendar_service.find_free_slot(
        participants=payload.participants,
        duration_minutes=payload.duration_minutes,
        preferred_date=payload.preferred_date,
    )
    if not slot:
        raise AppException("No common free slot found for participants", status_code=409)

    event = calendar_service.create_event(
        title=payload.title,
        participants=payload.participants,
        start=slot,
        duration_minutes=payload.duration_minutes,
    )

    meeting = Meeting(
        title=payload.title,
        participants=json.dumps(payload.participants),
        duration_minutes=payload.duration_minutes,
        meeting_date=event["meeting_date"],
        meeting_time=event["meeting_time"],
        calendar_event_id=event["calendar_event_id"],
        meet_link=event["meet_link"],
        status="Scheduled",
    )
    return repo.create(meeting)


@router.get("/{meeting_id}", response_model=MeetingResponse)
def get_meeting(meeting_id: int, db: Session = Depends(get_db)):
    meeting = MeetingRepository(db).get(meeting_id)
    if not meeting:
        raise NotFoundException("Meeting", meeting_id)
    return meeting
