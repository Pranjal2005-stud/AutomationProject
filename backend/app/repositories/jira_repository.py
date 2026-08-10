from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.jira_ticket import JiraTicket
from app.repositories.base import BaseRepository


class JiraTicketRepository(BaseRepository[JiraTicket]):
    def __init__(self, db: Session):
        super().__init__(JiraTicket, db)

    def get_by_jira_key(self, jira_key: str) -> Optional[JiraTicket]:
        return self.db.query(JiraTicket).filter(JiraTicket.jira_key == jira_key).first()

    def get_by_email_id(self, email_id: int) -> Optional[JiraTicket]:
        return self.db.query(JiraTicket).filter(JiraTicket.email_id == email_id).first()

    def get_recent(self, limit: int = 10) -> List[JiraTicket]:
        return self.db.query(JiraTicket).order_by(JiraTicket.created_at.desc()).limit(limit).all()

    def count_by_priority(self) -> List[dict]:
        rows = (
            self.db.query(JiraTicket.priority, func.count(JiraTicket.id).label("count"))
            .group_by(JiraTicket.priority)
            .all()
        )
        return [{"label": r.priority or "Unknown", "value": r.count} for r in rows]

    def count_by_category(self) -> List[dict]:
        rows = (
            self.db.query(JiraTicket.issue_type, func.count(JiraTicket.id).label("count"))
            .group_by(JiraTicket.issue_type)
            .all()
        )
        return [{"label": r.issue_type or "Unknown", "value": r.count} for r in rows]
