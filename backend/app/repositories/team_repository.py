from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.team import Team, TeamMember
from app.repositories.base import BaseRepository


class TeamRepository(BaseRepository[Team]):
    def __init__(self, db: Session):
        super().__init__(Team, db)

    def get_by_name(self, name: str) -> Optional[Team]:
        return self.db.query(Team).filter(Team.name == name).first()

    def get_with_members(self, team_id: int) -> Optional[Team]:
        return self.db.query(Team).filter(Team.id == team_id).first()

    def get_all_with_members(self) -> List[Team]:
        return self.db.query(Team).all()

    def get_members_by_team_ids(self, team_ids: List[int]) -> List[str]:
        """Return unique emails from all given team IDs."""
        rows = (
            self.db.query(TeamMember.email)
            .filter(TeamMember.team_id.in_(team_ids))
            .all()
        )
        return list({r.email for r in rows})

    def add_member(self, team_id: int, email: str, name: Optional[str] = None) -> TeamMember:
        member = TeamMember(team_id=team_id, email=email, name=name)
        self.db.add(member)
        self.db.commit()
        self.db.refresh(member)
        return member

    def remove_member(self, member_id: int) -> bool:
        member = self.db.query(TeamMember).filter(TeamMember.id == member_id).first()
        if not member:
            return False
        self.db.delete(member)
        self.db.commit()
        return True

    def get_member(self, member_id: int) -> Optional[TeamMember]:
        return self.db.query(TeamMember).filter(TeamMember.id == member_id).first()

    def email_exists_in_team(self, team_id: int, email: str, exclude_member_id: Optional[int] = None) -> bool:
        q = self.db.query(TeamMember).filter(
            TeamMember.team_id == team_id,
            TeamMember.email == email,
        )
        if exclude_member_id:
            q = q.filter(TeamMember.id != exclude_member_id)
        return q.first() is not None
