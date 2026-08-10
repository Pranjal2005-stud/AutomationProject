from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.database.session import get_db
from app.models.jira_ticket import JiraTicket
from app.repositories.jira_repository import JiraTicketRepository
from app.schemas.jira_ticket import JiraTicketCreate, JiraTicketResponse
from app.services.jira_service import jira_service

router = APIRouter(prefix="/tickets", tags=["Jira Tickets"])


@router.get("/", response_model=List[JiraTicketResponse])
def list_tickets(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return JiraTicketRepository(db).get_all(skip, limit)


@router.post("/", response_model=JiraTicketResponse, status_code=201)
def create_ticket(payload: JiraTicketCreate, db: Session = Depends(get_db)):
    repo = JiraTicketRepository(db)
    result = jira_service.create_issue(
        summary=payload.summary,
        description=payload.description or "",
        priority=payload.priority,
        issue_type=payload.issue_type,
    )
    ticket = JiraTicket(
        jira_key=result["jira_key"],
        summary=payload.summary,
        description=payload.description,
        priority=payload.priority,
        issue_type=payload.issue_type,
        email_id=payload.email_id,
    )
    return repo.create(ticket)


@router.get("/{ticket_id}", response_model=JiraTicketResponse)
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = JiraTicketRepository(db).get(ticket_id)
    if not ticket:
        raise NotFoundException("JiraTicket", ticket_id)
    return ticket


@router.get("/{ticket_id}/jira-url", response_model=dict)
def get_jira_url(ticket_id: int, db: Session = Depends(get_db)):
    from app.core.config import get_settings
    ticket = JiraTicketRepository(db).get(ticket_id)
    if not ticket:
        raise NotFoundException("JiraTicket", ticket_id)
    settings = get_settings()
    return {"url": f"{settings.JIRA_URL}/browse/{ticket.jira_key}"}
