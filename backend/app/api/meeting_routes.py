import json
import re
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from google.auth.exceptions import RefreshError

from app.core.exceptions import AppException, ExternalServiceException, NotFoundException
from app.database.session import get_db
from app.models.meeting import Meeting
from app.repositories.log_repository import MeetingRepository
from app.repositories.team_repository import TeamRepository
from app.schemas.meeting import (
    MeetingCreate,
    MeetingResponse,
    MeetingUpdate,
    UpcomingMeetingAttendee,
    UpcomingMeetingResponse,
)
from app.services.calendar_service import calendar_service

router = APIRouter(prefix="/meetings", tags=["Meetings"])

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _validate_emails(emails: List[str]):
    for e in emails:
        if not EMAIL_RE.match(e):
            raise AppException(f"Invalid email address: {e}", status_code=422)


def _resolve_attendees(participants: List[str], team_ids: List[int], db: Session) -> tuple[List[str], List[str]]:
    """Returns (unique_emails, team_names)."""
    team_repo = TeamRepository(db)
    team_names = []
    emails = set(participants)

    for tid in team_ids:
        team = team_repo.get_with_members(tid)
        if not team:
            raise NotFoundException("Team", tid)
        if not team.members:
            raise AppException(f"Team '{team.name}' has no members", status_code=422)
        team_names.append(team.name)
        for m in team.members:
            emails.add(m.email)

    if not emails:
        raise AppException("At least one participant or team is required", status_code=422)

    _validate_emails(list(emails))
    return list(emails), team_names


@router.get("/upcoming", response_model=List[UpcomingMeetingResponse])
def get_upcoming_meetings(db: Session = Depends(get_db)):
    # Use local date so stored meeting_date strings (local time) compare correctly
    today_str = datetime.now().strftime("%Y-%m-%d")
    now_time_str = datetime.now().strftime("%H:%M")

    meetings = (
        db.query(Meeting)
        .filter(Meeting.status == "Scheduled")
        .all()
    )
    upcoming = []
    for m in meetings:
        if not m.meeting_date or not m.meeting_time:
            continue
        # Include today's meetings that haven't ended yet, plus all future dates
        if m.meeting_date < today_str:
            continue
        if m.meeting_date == today_str and m.meeting_time < now_time_str:
            continue

        try:
            emails = json.loads(m.participants) if m.participants else []
        except (json.JSONDecodeError, TypeError):
            emails = []

        attendees = [UpcomingMeetingAttendee(email=e) for e in emails]

        upcoming.append(UpcomingMeetingResponse(
            id=m.id,
            title=m.title,
            meeting_date=m.meeting_date,
            meeting_time=m.meeting_time,
            duration_minutes=m.duration_minutes,
            team_names=m.team_names,
            attendees=attendees,
            meet_link=m.meet_link,
            calendar_link=m.calendar_link,
            calendar_event_id=m.calendar_event_id,
            status=m.status,
        ))

    upcoming.sort(key=lambda x: (x.meeting_date or "", x.meeting_time or ""))
    return upcoming


@router.get("/", response_model=List[MeetingResponse])
def list_meetings(status: str = None, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    q = db.query(Meeting)
    if status:
        q = q.filter(Meeting.status == status)
    else:
        # Exclude cancelled by default so the UI only shows active meetings
        q = q.filter(Meeting.status != "Cancelled")
    return q.order_by(Meeting.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=MeetingResponse, status_code=201)
def schedule_meeting(payload: MeetingCreate, db: Session = Depends(get_db)):
    if not payload.participants and not payload.team_ids:
        raise AppException("Provide at least one participant email or team_id", status_code=422)

    attendees, team_names = _resolve_attendees(payload.participants, payload.team_ids, db)

    slot = calendar_service.find_free_slot(
        participants=attendees,
        duration_minutes=payload.duration_minutes,
        preferred_date=payload.preferred_date,
    )
    if not slot:
        raise AppException("No common free slot found for participants", status_code=409)

    event = calendar_service.create_event(
        title=payload.title,
        participants=attendees,
        start=slot,
        duration_minutes=payload.duration_minutes,
    )

    meeting = Meeting(
        title=payload.title,
        participants=json.dumps(attendees),
        team_names=json.dumps(team_names) if team_names else None,
        duration_minutes=payload.duration_minutes,
        meeting_date=event["meeting_date"],
        meeting_time=event["meeting_time"],
        calendar_event_id=event["calendar_event_id"],
        meet_link=event["meet_link"],
        calendar_link=event.get("calendar_link"),
        status="Scheduled",
    )
    return MeetingRepository(db).create(meeting)


@router.get("/{meeting_id}", response_model=MeetingResponse)
def get_meeting(meeting_id: int, db: Session = Depends(get_db)):
    meeting = MeetingRepository(db).get(meeting_id)
    if not meeting:
        raise NotFoundException("Meeting", meeting_id)
    return meeting


@router.delete("/{meeting_id}/cancel", response_model=MeetingResponse)
def cancel_meeting(meeting_id: int, db: Session = Depends(get_db)):
    meeting = MeetingRepository(db).get(meeting_id)
    if not meeting:
        raise NotFoundException("Meeting", meeting_id)
    if meeting.status == "Cancelled":
        raise AppException("Meeting is already cancelled", status_code=409)

    if meeting.calendar_event_id:
        try:
            calendar_service.cancel_event(meeting.calendar_event_id)
        except RefreshError:
            raise ExternalServiceException(
                "Google Calendar",
                "OAuth token expired or revoked. Delete calendar_token.json and restart the server to re-authenticate."
            )

    meeting.status = "Cancelled"
    return MeetingRepository(db).update(meeting)


@router.put("/{meeting_id}", response_model=MeetingResponse)
def update_meeting(meeting_id: int, payload: MeetingUpdate, db: Session = Depends(get_db)):
    repo = MeetingRepository(db)
    meeting = repo.get(meeting_id)
    if not meeting:
        raise NotFoundException("Meeting", meeting_id)
    if meeting.status == "Cancelled":
        raise AppException("Cannot edit a cancelled meeting", status_code=409)

    title = payload.title or meeting.title
    duration = payload.duration_minutes or meeting.duration_minutes
    preferred_date = payload.preferred_date or meeting.meeting_date

    # Resolve attendees
    current_participants = json.loads(meeting.participants) if meeting.participants else []
    participants = payload.participants if payload.participants is not None else current_participants
    team_ids = payload.team_ids if payload.team_ids is not None else []

    attendees, team_names = _resolve_attendees(participants, team_ids, db)

    slot = calendar_service.find_free_slot(
        participants=attendees,
        duration_minutes=duration,
        preferred_date=preferred_date,
    )
    if not slot:
        raise AppException("No common free slot found for updated participants", status_code=409)

    if meeting.calendar_event_id:
        event = calendar_service.update_event(
            calendar_event_id=meeting.calendar_event_id,
            title=title,
            participants=attendees,
            start=slot,
            duration_minutes=duration,
        )
    else:
        event = calendar_service.create_event(
            title=title,
            participants=attendees,
            start=slot,
            duration_minutes=duration,
        )
        meeting.calendar_event_id = event["calendar_event_id"]

    meeting.title = title
    meeting.participants = json.dumps(attendees)
    meeting.team_names = json.dumps(team_names) if team_names else meeting.team_names
    meeting.duration_minutes = duration
    meeting.meeting_date = event["meeting_date"]
    meeting.meeting_time = event["meeting_time"]
    meeting.meet_link = event.get("meet_link", meeting.meet_link)
    meeting.calendar_link = event.get("calendar_link", meeting.calendar_link)

    return repo.update(meeting)
