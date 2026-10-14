from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.exceptions import AppException, DuplicateException, NotFoundException
from app.database.session import get_db
from app.repositories.team_repository import TeamRepository
from app.schemas.team import TeamCreate, TeamMemberCreate, TeamMemberResponse, TeamResponse, TeamUpdate

router = APIRouter(prefix="/teams", tags=["Teams"])


@router.get("/", response_model=List[TeamResponse])
def list_teams(db: Session = Depends(get_db)):
    return TeamRepository(db).get_all_with_members()


@router.post("/", response_model=TeamResponse, status_code=201)
def create_team(payload: TeamCreate, db: Session = Depends(get_db)):
    repo = TeamRepository(db)
    if repo.get_by_name(payload.name):
        raise DuplicateException(f"Team '{payload.name}'")

    from app.models.team import Team, TeamMember
    team = Team(name=payload.name, description=payload.description)
    db.add(team)
    db.flush()

    emails_seen = set()
    for m in payload.members:
        if m.email in emails_seen:
            raise AppException(f"Duplicate email in request: {m.email}", status_code=422)
        emails_seen.add(m.email)
        db.add(TeamMember(team_id=team.id, email=m.email, name=m.name))

    db.commit()
    db.refresh(team)
    return team


@router.get("/{team_id}", response_model=TeamResponse)
def get_team(team_id: int, db: Session = Depends(get_db)):
    team = TeamRepository(db).get_with_members(team_id)
    if not team:
        raise NotFoundException("Team", team_id)
    return team


@router.put("/{team_id}", response_model=TeamResponse)
def update_team(team_id: int, payload: TeamUpdate, db: Session = Depends(get_db)):
    repo = TeamRepository(db)
    team = repo.get(team_id)
    if not team:
        raise NotFoundException("Team", team_id)
    if payload.name and payload.name != team.name:
        if repo.get_by_name(payload.name):
            raise DuplicateException(f"Team '{payload.name}'")
        team.name = payload.name
    if payload.description is not None:
        team.description = payload.description
    return repo.update(team)


@router.delete("/{team_id}", status_code=204)
def delete_team(team_id: int, db: Session = Depends(get_db)):
    repo = TeamRepository(db)
    if not repo.get(team_id):
        raise NotFoundException("Team", team_id)
    repo.delete(team_id)


@router.post("/{team_id}/members", response_model=TeamMemberResponse, status_code=201)
def add_member(team_id: int, payload: TeamMemberCreate, db: Session = Depends(get_db)):
    repo = TeamRepository(db)
    if not repo.get(team_id):
        raise NotFoundException("Team", team_id)
    if repo.email_exists_in_team(team_id, payload.email):
        raise DuplicateException(f"Email '{payload.email}' in this team")
    return repo.add_member(team_id, payload.email, payload.name)


@router.delete("/{team_id}/members/{member_id}", status_code=204)
def remove_member(team_id: int, member_id: int, db: Session = Depends(get_db)):
    repo = TeamRepository(db)
    if not repo.get(team_id):
        raise NotFoundException("Team", team_id)
    member = repo.get_member(member_id)
    if not member or member.team_id != team_id:
        raise NotFoundException("TeamMember", member_id)
    repo.remove_member(member_id)
