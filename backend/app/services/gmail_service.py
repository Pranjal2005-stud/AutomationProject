import base64
import os
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

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
]

IGNORED_CATEGORIES = {"CATEGORY_PROMOTIONS", "CATEGORY_SOCIAL", "CATEGORY_UPDATES", "SPAM"}


class GmailService:
    def __init__(self):
        self._service = None

    def _authenticate(self):
        creds = None
        token_file = settings.GMAIL_TOKEN_FILE
        creds_file = settings.GMAIL_CREDENTIALS_FILE

        if os.path.exists(token_file):
            creds = Credentials.from_authorized_user_file(token_file, SCOPES)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not os.path.exists(creds_file):
                    raise ExternalServiceException("Gmail", f"credentials file not found: {creds_file}")
                flow = InstalledAppFlow.from_client_secrets_file(creds_file, SCOPES)
                creds = flow.run_local_server(port=0)
            with open(token_file, "w") as f:
                f.write(creds.to_json())

        self._service = build("gmail", "v1", credentials=creds)

    @property
    def service(self):
        if not self._service:
            self._authenticate()
        return self._service

    def fetch_unread_emails(self, max_results: int = 20) -> List[dict]:
        try:
            result = self.service.users().messages().list(
                userId="me",
                labelIds=["INBOX", "UNREAD"],
                maxResults=max_results,
            ).execute()

            messages = result.get("messages", [])
            emails = []
            for msg in messages:
                parsed = self._parse_message(msg["id"])
                if parsed:
                    emails.append(parsed)
            return emails
        except HttpError as e:
            raise ExternalServiceException("Gmail", str(e))

    def _parse_message(self, message_id: str) -> Optional[dict]:
        try:
            msg = self.service.users().messages().get(
                userId="me", id=message_id, format="full"
            ).execute()

            label_ids = msg.get("labelIds", [])
            if any(cat in label_ids for cat in IGNORED_CATEGORIES):
                return None

            headers = {h["name"]: h["value"] for h in msg["payload"].get("headers", [])}
            body = self._extract_body(msg["payload"])

            return {
                "gmail_message_id": message_id,
                "thread_id": msg.get("threadId"),
                "sender_name": self._parse_sender_name(headers.get("From", "")),
                "sender_email": self._parse_sender_email(headers.get("From", "")),
                "receiver_email": headers.get("To", ""),
                "subject": headers.get("Subject", "(No Subject)"),
                "body": body,
            }
        except Exception as e:
            logger.error(f"Failed to parse message {message_id}: {e}")
            return None

    def mark_as_read(self, message_id: str) -> None:
        try:
            self.service.users().messages().modify(
                userId="me",
                id=message_id,
                body={"removeLabelIds": ["UNREAD"]},
            ).execute()
        except HttpError as e:
            logger.warning(f"Could not mark message {message_id} as read: {e}")

    def _extract_body(self, payload: dict) -> str:
        if "parts" in payload:
            for part in payload["parts"]:
                if part.get("mimeType") == "text/plain":
                    data = part.get("body", {}).get("data", "")
                    if data:
                        return base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
        data = payload.get("body", {}).get("data", "")
        if data:
            return base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
        return ""

    def _parse_sender_name(self, from_header: str) -> str:
        if "<" in from_header:
            return from_header.split("<")[0].strip().strip('"')
        return from_header.strip()

    def _parse_sender_email(self, from_header: str) -> str:
        if "<" in from_header:
            return from_header.split("<")[1].rstrip(">").strip()
        return from_header.strip()


gmail_service = GmailService()
