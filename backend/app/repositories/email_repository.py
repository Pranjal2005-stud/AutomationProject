from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date

from app.models.email import Email
from app.repositories.base import BaseRepository


class EmailRepository(BaseRepository[Email]):
    def __init__(self, db: Session):
        super().__init__(Email, db)

    def get_by_gmail_id(self, gmail_message_id: str) -> Optional[Email]:
        return self.db.query(Email).filter(Email.gmail_message_id == gmail_message_id).first()

    def get_by_status(self, status: str, skip: int = 0, limit: int = 100) -> List[Email]:
        return (
            self.db.query(Email)
            .filter(Email.status == status)
            .order_by(Email.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_by_status(self, status: str) -> int:
        return self.db.query(Email).filter(Email.status == status).count()

    def get_recent(self, limit: int = 10) -> List[Email]:
        return self.db.query(Email).order_by(Email.created_at.desc()).limit(limit).all()

    def get_todays_count(self) -> int:
        return (
            self.db.query(Email)
            .filter(cast(Email.created_at, Date) == date.today())
            .count()
        )

    def get_emails_per_day(self, days: int = 7) -> List[dict]:
        rows = (
            self.db.query(
                cast(Email.created_at, Date).label("day"),
                func.count(Email.id).label("count"),
            )
            .group_by(cast(Email.created_at, Date))
            .order_by(cast(Email.created_at, Date).desc())
            .limit(days)
            .all()
        )
        return [{"label": str(r.day), "value": r.count} for r in rows]

    def search(self, query: str, skip: int = 0, limit: int = 50) -> List[Email]:
        pattern = f"%{query}%"
        return (
            self.db.query(Email)
            .filter(
                Email.subject.ilike(pattern)
                | Email.sender_email.ilike(pattern)
                | Email.body.ilike(pattern)
            )
            .offset(skip)
            .limit(limit)
            .all()
        )
