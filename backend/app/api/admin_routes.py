from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.repositories.log_repository import ProcessingLogRepository
from app.repositories.settings_repository import SettingsRepository
from app.schemas.common import ProcessingLogResponse, SystemSettingResponse, SystemSettingUpdate

logs_router = APIRouter(prefix="/logs", tags=["Logs"])
settings_router = APIRouter(prefix="/settings", tags=["Settings"])


@logs_router.get("/", response_model=List[ProcessingLogResponse])
def get_logs(limit: int = 100, db: Session = Depends(get_db)):
    return ProcessingLogRepository(db).get_recent(limit)


@settings_router.get("/", response_model=List[SystemSettingResponse])
def list_settings(db: Session = Depends(get_db)):
    return SettingsRepository(db).get_all()


@settings_router.get("/env", response_model=dict)
def get_env_settings():
    """Returns current values loaded from .env — read only, for display in UI."""
    from app.core.config import get_settings
    s = get_settings()
    return {
        "GROQ_API_KEY": "*" * 8 if s.GROQ_API_KEY else "",
        "GROQ_MODEL": s.GROQ_MODEL,
        "JIRA_URL": s.JIRA_URL,
        "JIRA_EMAIL": s.JIRA_EMAIL,
        "JIRA_API_TOKEN": "*" * 8 if s.JIRA_API_TOKEN else "",
        "JIRA_PROJECT_KEY": s.JIRA_PROJECT_KEY,
        "GMAIL_CREDENTIALS_FILE": s.GMAIL_CREDENTIALS_FILE,
        "GOOGLE_CALENDAR_ID": s.GOOGLE_CALENDAR_ID,
    }


@settings_router.put("/{key}", response_model=SystemSettingResponse)
def upsert_setting(key: str, payload: SystemSettingUpdate, db: Session = Depends(get_db)):
    return SettingsRepository(db).upsert(key, payload.value)
