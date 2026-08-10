from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.email_processor import email_processor

router = APIRouter(prefix="/gmail", tags=["Gmail"])


@router.post("/poll", response_model=dict)
def poll_gmail(db: Session = Depends(get_db)):
    """Manually trigger Gmail polling and processing pipeline."""
    result = email_processor.run(db)
    return result
