from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import asc, desc

from app.core.exceptions import NotFoundException
from app.database.session import get_db
from app.models.jira_ticket import JiraTicket
from app.repositories.jira_repository import JiraTicketRepository
from app.schemas.jira_ticket import JiraTicketCreate, JiraTicketResponse
from app.services.jira_service import jira_service

router = APIRouter(prefix="/tickets", tags=["Jira Tickets"])

PRIORITY_ORDER = {"Highest": 0, "High": 1, "Medium": 2, "Low": 3, "Lowest": 4}


@router.get("/", response_model=List[JiraTicketResponse])
def list_tickets(
    skip: int = 0,
    limit: int = 50,
    priority: Optional[str] = None,
    sort: Optional[str] = Query(None, regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    q = db.query(JiraTicket)
    if priority:
        q = q.filter(JiraTicket.priority == priority)
    if sort == "asc":
        q = q.order_by(asc(JiraTicket.created_at))
    else:
        q = q.order_by(desc(JiraTicket.created_at))
    return q.offset(skip).limit(limit).all()


@router.get("/priority-heatmap", response_model=list)
def get_priority_heatmap(days: int = 14, db: Session = Depends(get_db)):
    """Returns tickets grouped by date + priority for the last N days."""
    from sqlalchemy import func, cast, Date
    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(
            cast(JiraTicket.created_at, Date).label("date"),
            JiraTicket.priority,
            func.count(JiraTicket.id).label("count"),
        )
        .filter(JiraTicket.created_at >= cutoff)
        .group_by(cast(JiraTicket.created_at, Date), JiraTicket.priority)
        .order_by(cast(JiraTicket.created_at, Date))
        .all()
    )
    # Pivot into [{date, Highest, High, Medium, Low, Lowest}, ...]
    pivot: dict = {}
    for row in rows:
        d = str(row.date)
        if d not in pivot:
            pivot[d] = {"date": d, "Highest": 0, "High": 0, "Medium": 0, "Low": 0, "Lowest": 0}
        pivot[d][row.priority or "Medium"] = row.count
    return list(pivot.values())


@router.post("/sync", response_model=dict)
def sync_tickets_from_jira(db: Session = Depends(get_db)):
    """Pull all tickets from Jira project and upsert into local DB."""
    repo = JiraTicketRepository(db)
    synced, skipped = 0, 0
    start_at = 0
    max_results = 50

    while True:
        issues = jira_service.search_issues(start_at=start_at, max_results=max_results)
        if not issues:
            break
        for issue in issues:
            fields = issue.get("fields", {})
            jira_key = issue["key"]
            existing = repo.get_by_jira_key(jira_key)
            if existing:
                # Update status
                existing.status = fields.get("status", {}).get("name", existing.status)
                db.commit()
                skipped += 1
            else:
                ticket = JiraTicket(
                    jira_key=jira_key,
                    summary=fields.get("summary", ""),
                    description=(
                        fields.get("description") or ""
                        if isinstance(fields.get("description"), str)
                        else ""
                    ),
                    priority=fields.get("priority", {}).get("name", "Medium"),
                    issue_type=fields.get("issuetype", {}).get("name", "Task"),
                    status=fields.get("status", {}).get("name", "Open"),
                )
                repo.create(ticket)
                synced += 1
        if len(issues) < max_results:
            break
        start_at += max_results

    return {"synced": synced, "updated": skipped}


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


@router.patch("/{ticket_id}/priority", response_model=JiraTicketResponse)
def update_ticket_priority(ticket_id: int, payload: dict, db: Session = Depends(get_db)):
    ticket = JiraTicketRepository(db).get(ticket_id)
    if not ticket:
        raise NotFoundException("JiraTicket", ticket_id)
    new_priority = payload.get("priority")
    if not new_priority:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="priority is required")
    # Update in Jira
    if ticket.jira_key and "MOCK-" not in ticket.jira_key:
        jira_service.update_priority(ticket.jira_key, new_priority)
    # Update locally
    ticket.priority = new_priority
    db.commit()
    db.refresh(ticket)
    return ticket


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
