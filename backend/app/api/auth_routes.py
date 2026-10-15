import json
import os

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

router = APIRouter(prefix="/auth", tags=["Auth"])

GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
]
CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar"]


def _oauth_flow(creds_file: str, token_file: str, scopes: list) -> dict:
    """Run OAuth flow and save token. Returns status dict."""
    if not os.path.exists(creds_file):
        return {"status": "error", "message": f"credentials.json not found at: {creds_file}"}

    creds = None
    if os.path.exists(token_file):
        creds = Credentials.from_authorized_user_file(token_file, scopes)

    if creds and creds.valid:
        return {"status": "already_authenticated", "token_file": token_file}

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    else:
        flow = InstalledAppFlow.from_client_secrets_file(creds_file, scopes)
        creds = flow.run_local_server(port=0)

    with open(token_file, "w") as f:
        f.write(creds.to_json())

    return {"status": "authenticated", "token_file": token_file}


@router.post("/setup")
def setup_google_auth():
    """
    Triggers OAuth consent for both Gmail and Google Calendar.
    Opens browser windows for each if tokens don't exist or are expired.
    Saves token.json and calendar_token.json in the backend directory.
    """
    creds_file = settings.GMAIL_CREDENTIALS_FILE

    gmail_result = _oauth_flow(creds_file, settings.GMAIL_TOKEN_FILE, GMAIL_SCOPES)
    if gmail_result["status"] == "error":
        return JSONResponse(status_code=400, content={"error": gmail_result["message"]})

    calendar_result = _oauth_flow(creds_file, settings.CALENDAR_TOKEN_FILE, CALENDAR_SCOPES)
    if calendar_result["status"] == "error":
        return JSONResponse(status_code=400, content={"error": calendar_result["message"]})

    return {
        "gmail": gmail_result,
        "calendar": calendar_result,
    }


@router.get("/status")
def auth_status():
    """Check which token files exist and are valid."""
    creds_file = settings.GMAIL_CREDENTIALS_FILE

    def check(token_file: str, scopes: list) -> dict:
        if not os.path.exists(token_file):
            return {"exists": False, "valid": False}
        try:
            creds = Credentials.from_authorized_user_file(token_file, scopes)
            return {"exists": True, "valid": creds.valid, "expired": creds.expired}
        except Exception as e:
            return {"exists": True, "valid": False, "error": str(e)}

    return {
        "credentials_file": {"exists": os.path.exists(creds_file), "path": creds_file},
        "gmail_token": check(settings.GMAIL_TOKEN_FILE, GMAIL_SCOPES),
        "calendar_token": check(settings.CALENDAR_TOKEN_FILE, CALENDAR_SCOPES),
    }
