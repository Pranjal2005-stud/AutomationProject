from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.database.session import get_db
from app.models.email import Email
from app.repositories.email_repository import EmailRepository
from app.schemas.email import EmailCreate, EmailResponse, EmailUpdate

router = APIRouter(prefix="/emails", tags=["Emails"])


@router.get("/", response_model=List[EmailResponse])
def list_emails(
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    repo = EmailRepository(db)
    if search:
        return repo.search(search, skip, limit)
    if status:
        return repo.get_by_status(status, skip, limit)
    return repo.get_all(skip, limit)


@router.post("/", response_model=EmailResponse, status_code=201)
def create_email(payload: EmailCreate, db: Session = Depends(get_db)):
    repo = EmailRepository(db)
    email = Email(**payload.model_dump())
    return repo.create(email)


@router.get("/{email_id}", response_model=EmailResponse)
def get_email(email_id: int, db: Session = Depends(get_db)):
    repo = EmailRepository(db)
    email = repo.get(email_id)
    if not email:
        raise NotFoundException("Email", email_id)
    return email


@router.patch("/{email_id}", response_model=EmailResponse)
def update_email(email_id: int, payload: EmailUpdate, db: Session = Depends(get_db)):
    repo = EmailRepository(db)
    email = repo.get(email_id)
    if not email:
        raise NotFoundException("Email", email_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(email, field, value)
    return repo.update(email)


@router.post("/{email_id}/create-ticket", response_model=dict)
def create_ticket_for_email(email_id: int, db: Session = Depends(get_db)):
    """Manually trigger LLM extraction + Jira ticket creation for an email."""
    from app.repositories.jira_repository import JiraTicketRepository
    from app.services.llm_service import llm_service
    from app.services.jira_service import jira_service
    from app.models.jira_ticket import JiraTicket

    email_repo = EmailRepository(db)
    email = email_repo.get(email_id)
    if not email:
        raise NotFoundException("Email", email_id)

    ticket_data = llm_service.extract_ticket_data(email.subject, email.body)
    result = jira_service.create_issue(
        summary=ticket_data["summary"],
        description=ticket_data["description"],
        priority=ticket_data["priority"],
        issue_type=ticket_data["issue_type"],
    )

    jira_repo = JiraTicketRepository(db)
    ticket = JiraTicket(
        jira_key=result["jira_key"],
        summary=ticket_data["summary"],
        description=ticket_data["description"],
        priority=ticket_data["priority"],
        issue_type=ticket_data["issue_type"],
        email_id=email.id,
    )
    jira_repo.create(ticket)

    email.status = "Processed"
    email.ticket_created = True
    email.jira_issue_key = result["jira_key"]
    email_repo.update(email)

    return {"jira_key": result["jira_key"], "jira_url": result["jira_url"]}


@router.delete("/{email_id}", status_code=204)
def delete_email(email_id: int, db: Session = Depends(get_db)):
    repo = EmailRepository(db)
    if not repo.delete(email_id):
        raise NotFoundException("Email", email_id)


@router.post("/{email_id}/retry", response_model=dict)
def retry_email(email_id: int, db: Session = Depends(get_db)):
    """Reset a failed email back to Pending for reprocessing."""
    repo = EmailRepository(db)
    email = repo.get(email_id)
    if not email:
        raise NotFoundException("Email", email_id)
    email.status = "Pending"
    repo.update(email)
    return {"message": f"Email {email_id} reset to Pending"}
