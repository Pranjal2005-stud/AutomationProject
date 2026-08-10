from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.meeting import Meeting
from app.models.processing_log import ProcessingLog
from app.repositories.base import BaseRepository


class MeetingRepository(BaseRepository[Meeting]):
    def __init__(self, db: Session):
        super().__init__(Meeting, db)

    def get_recent(self, limit: int = 10) -> List[Meeting]:
        return self.db.query(Meeting).order_by(Meeting.created_at.desc()).limit(limit).all()

    def count_by_status(self) -> List[dict]:
        rows = (
            self.db.query(Meeting.status, func.count(Meeting.id).label("count"))
            .group_by(Meeting.status)
            .all()
        )
        return [{"label": r.status, "value": r.count} for r in rows]


class ProcessingLogRepository(BaseRepository[ProcessingLog]):
    def __init__(self, db: Session):
        super().__init__(ProcessingLog, db)

    def get_recent(self, limit: int = 50) -> List[ProcessingLog]:
        return (
            self.db.query(ProcessingLog)
            .order_by(ProcessingLog.timestamp.desc())
            .limit(limit)
            .all()
        )

    def log(
        self,
        module: str,
        action: str,
        status: str,
        details: str = None,
        duration_ms: int = None,
    ) -> ProcessingLog:
        entry = ProcessingLog(
            module=module,
            action=action,
            status=status,
            details=details,
            duration_ms=duration_ms,
        )
        return self.create(entry)
