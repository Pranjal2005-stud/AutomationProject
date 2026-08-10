import os
from datetime import datetime, timedelta, date
from typing import List, Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.core.config import get_settings
from app.core.exceptions import ExternalServiceException
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

SCOPES = ["https://www.googleapis.com/auth/calendar"]


class CalendarService:
    def __init__(self):
        self._service = None

    def _authenticate(self):
        creds = None
        token_file = "calendar_token.json"
        creds_file = settings.GMAIL_CREDENTIALS_FILE

        if os.path.exists(token_file):
            creds = Credentials.from_authorized_user_file(token_file, SCOPES)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not os.path.exists(creds_file):
                    raise ExternalServiceException("Google Calendar", f"credentials file not found: {creds_file}")
                flow = InstalledAppFlow.from_client_secrets_file(creds_file, SCOPES)
                creds = flow.run_local_server(port=0)
            with open(token_file, "w") as f:
                f.write(creds.to_json())

        self._service = build("calendar", "v3", credentials=creds)

    @property
    def service(self):
        if not self._service:
            self._authenticate()
        return self._service

    def find_free_slot(
        self,
        participants: List[str],
        duration_minutes: int = 30,
        preferred_date: Optional[str] = None,
    ) -> Optional[datetime]:
        """Find the first common free slot for all participants."""
        start_date = (
            datetime.strptime(preferred_date, "%Y-%m-%d")
            if preferred_date
            else datetime.utcnow().replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(days=1)
        )

        # Check 5 business days
        for day_offset in range(5):
            check_date = start_date + timedelta(days=day_offset)
            if check_date.weekday() >= 5:  # skip weekends
                continue

            for hour in range(9, 17):  # 9am–5pm
                slot_start = check_date.replace(hour=hour, minute=0, second=0, microsecond=0)
                slot_end = slot_start + timedelta(minutes=duration_minutes)

                if self._is_slot_free(participants, slot_start, slot_end):
                    return slot_start

        return None

    def _is_slot_free(self, participants: List[str], start: datetime, end: datetime) -> bool:
        try:
            body = {
                "timeMin": start.isoformat() + "Z",
                "timeMax": end.isoformat() + "Z",
                "items": [{"id": email} for email in participants],
            }
            result = self.service.freebusy().query(body=body).execute()
            calendars = result.get("calendars", {})
            for email in participants:
                busy = calendars.get(email, {}).get("busy", [])
                if busy:
                    return False
            return True
        except Exception as e:
            logger.warning(f"Freebusy check failed: {e}")
            return True  # assume free if check fails

    def create_event(
        self,
        title: str,
        participants: List[str],
        start: datetime,
        duration_minutes: int = 30,
    ) -> dict:
        end = start + timedelta(minutes=duration_minutes)
        event = {
            "summary": title,
            "start": {"dateTime": start.isoformat() + "Z", "timeZone": "UTC"},
            "end": {"dateTime": end.isoformat() + "Z", "timeZone": "UTC"},
            "attendees": [{"email": e} for e in participants],
            "conferenceData": {
                "createRequest": {"requestId": f"meet-{int(start.timestamp())}"}
            },
        }
        try:
            created = (
                self.service.events()
                .insert(
                    calendarId=settings.GOOGLE_CALENDAR_ID,
                    body=event,
                    conferenceDataVersion=1,
                    sendUpdates="all",
                )
                .execute()
            )
            meet_link = (
                created.get("conferenceData", {})
                .get("entryPoints", [{}])[0]
                .get("uri", "")
            )
            return {
                "calendar_event_id": created["id"],
                "meet_link": meet_link,
                "meeting_date": start.strftime("%Y-%m-%d"),
                "meeting_time": start.strftime("%H:%M"),
            }
        except HttpError as e:
            raise ExternalServiceException("Google Calendar", str(e))


calendar_service = CalendarService()
