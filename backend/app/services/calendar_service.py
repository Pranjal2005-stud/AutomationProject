import os
from datetime import datetime, timedelta
from typing import List, Optional
from zoneinfo import ZoneInfo

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


def _local_tz() -> ZoneInfo:
    return ZoneInfo(get_settings().TIMEZONE)


def _to_utc_iso(dt_local: datetime) -> str:
    """Convert a timezone-aware local datetime to UTC ISO string with Z suffix."""
    dt_utc = dt_local.astimezone(ZoneInfo("UTC"))
    return dt_utc.strftime("%Y-%m-%dT%H:%M:%S") + "Z"


def _local_now() -> datetime:
    return datetime.now(_local_tz())


class CalendarService:
    def __init__(self):
        self._service = None

    def _authenticate(self):
        creds = None
        token_file = settings.CALENDAR_TOKEN_FILE
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
        preferred_time: Optional[str] = None,
    ) -> Optional[datetime]:
        tz = _local_tz()
        if preferred_date:
            base = datetime.strptime(preferred_date, "%Y-%m-%d").replace(tzinfo=tz)
        else:
            base = (_local_now() + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)

        # Try exact preferred time first
        if preferred_time:
            try:
                h, m = map(int, preferred_time.split(":"))
                exact = base.replace(hour=h, minute=m, second=0, microsecond=0)
                if self._is_slot_free(participants, exact, exact + timedelta(minutes=duration_minutes)):
                    return exact
                return None  # conflict — caller handles suggestions
            except (ValueError, AttributeError):
                pass

        for day_offset in range(5):
            check = base + timedelta(days=day_offset)
            if check.weekday() >= 5:
                continue
            for hour in range(9, 17):
                slot = check.replace(hour=hour, minute=0, second=0, microsecond=0)
                if self._is_slot_free(participants, slot, slot + timedelta(minutes=duration_minutes)):
                    return slot
        return None

    def find_free_slots_on_date(
        self,
        participants: List[str],
        duration_minutes: int,
        date_str: str,
        limit: int = 4,
    ) -> List[str]:
        tz = _local_tz()
        try:
            base = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=tz)
        except ValueError:
            return []
        free = []
        for hour in range(9, 17):
            slot = base.replace(hour=hour, minute=0, second=0, microsecond=0)
            if self._is_slot_free(participants, slot, slot + timedelta(minutes=duration_minutes)):
                free.append(slot.strftime("%H:%M"))
                if len(free) >= limit:
                    break
        return free

    def _is_slot_free(self, participants: List[str], start: datetime, end: datetime) -> bool:
        try:
            body = {
                "timeMin": _to_utc_iso(start),
                "timeMax": _to_utc_iso(end),
                "items": [{"id": email} for email in participants],
            }
            result = self.service.freebusy().query(body=body).execute()
            for email in participants:
                if result.get("calendars", {}).get(email, {}).get("busy", []):
                    return False
            return True
        except Exception as e:
            logger.warning(f"Freebusy check failed: {e}")
            return True

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
            "start": {"dateTime": _to_utc_iso(start), "timeZone": "UTC"},
            "end":   {"dateTime": _to_utc_iso(end),   "timeZone": "UTC"},
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
            # Store local time in DB so UI shows what the user picked
            local_start = start.astimezone(_local_tz())
            return {
                "calendar_event_id": created["id"],
                "meet_link": meet_link,
                "calendar_link": created.get("htmlLink", ""),
                "meeting_date": local_start.strftime("%Y-%m-%d"),
                "meeting_time": local_start.strftime("%H:%M"),
            }
        except HttpError as e:
            raise ExternalServiceException("Google Calendar", str(e))

    def cancel_event(self, calendar_event_id: str) -> bool:
        """Cancel a Google Calendar event and notify attendees. Returns True on success."""
        try:
            self.service.events().delete(
                calendarId=settings.GOOGLE_CALENDAR_ID,
                eventId=calendar_event_id,
                sendUpdates="all",
            ).execute()
            return True
        except HttpError as e:
            if e.resp.status == 404:
                logger.warning(f"Calendar event {calendar_event_id} not found — treating as already deleted")
                return True  # already gone, still sync DB
            raise ExternalServiceException("Google Calendar", str(e))

    def update_event(
        self,
        calendar_event_id: str,
        title: str,
        participants: List[str],
        start: datetime,
        duration_minutes: int = 30,
    ) -> dict:
        end = start + timedelta(minutes=duration_minutes)
        body = {
            "summary": title,
            "start": {"dateTime": _to_utc_iso(start), "timeZone": "UTC"},
            "end":   {"dateTime": _to_utc_iso(end),   "timeZone": "UTC"},
            "attendees": [{"email": e} for e in participants],
        }
        try:
            updated = (
                self.service.events()
                .patch(
                    calendarId=settings.GOOGLE_CALENDAR_ID,
                    eventId=calendar_event_id,
                    body=body,
                    conferenceDataVersion=1,
                    sendUpdates="all",
                )
                .execute()
            )
            meet_link = (
                updated.get("conferenceData", {})
                .get("entryPoints", [{}])[0]
                .get("uri", "")
            )
            local_start = start.astimezone(_local_tz())
            return {
                "meet_link": meet_link,
                "calendar_link": updated.get("htmlLink", ""),
                "meeting_date": local_start.strftime("%Y-%m-%d"),
                "meeting_time": local_start.strftime("%H:%M"),
            }
        except HttpError as e:
            raise ExternalServiceException("Google Calendar", str(e))


calendar_service = CalendarService()
