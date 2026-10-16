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
    """Full two-way sync: upsert tickets from Jira, delete local tickets no longer in Jira."""
    repo = JiraTicketRepository(db)
    synced, updated, deleted = 0, 0, 0
    start_at = 0
    max_results = 50
    live_jira_keys: set = set()

    while True:
        issues = jira_service.search_issues(start_at=start_at, max_results=max_results)
        if not issues:
            break
        for issue in issues:
            fields = issue.get("fields", {})
            jira_key = issue["key"]
            live_jira_keys.add(jira_key)
            existing = repo.get_by_jira_key(jira_key)
            if existing:
                existing.status = fields.get("status", {}).get("name", existing.status)
                existing.priority = fields.get("priority", {}).get("name", existing.priority)
                existing.summary = fields.get("summary", existing.summary)
                db.commit()
                updated += 1
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

    # Delete local tickets that no longer exist in Jira (skip MOCK keys)
    if live_jira_keys:
        orphans = (
            db.query(JiraTicket)
            .filter(
                JiraTicket.jira_key.isnot(None),
                ~JiraTicket.jira_key.like("MOCK-%"),
                JiraTicket.jira_key.notin_(live_jira_keys),
            )
            .all()
        )
        for orphan in orphans:
            db.delete(orphan)
            deleted += 1
        db.commit()

    return {"synced": synced, "updated": updated, "deleted": deleted}


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
    # Update in Jira and pull back fresh status
    if ticket.jira_key and "MOCK-" not in ticket.jira_key:
        jira_service.update_priority(ticket.jira_key, new_priority)
        fresh = jira_service.get_issue(ticket.jira_key)
        if fresh:
            ticket.status = fresh.get("fields", {}).get("status", {}).get("name", ticket.status)
    ticket.priority = new_priority
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/{ticket_id}/sync", response_model=JiraTicketResponse)
def sync_ticket(ticket_id: int, db: Session = Depends(get_db)):
    """Pull fresh status and priority from Jira for a single ticket."""
    ticket = JiraTicketRepository(db).get(ticket_id)
    if not ticket:
        raise NotFoundException("JiraTicket", ticket_id)
    if ticket.jira_key and "MOCK-" not in ticket.jira_key:
        fresh = jira_service.get_issue(ticket.jira_key)
        if fresh:
            fields = fresh.get("fields", {})
            ticket.status = fields.get("status", {}).get("name", ticket.status)
            ticket.priority = fields.get("priority", {}).get("name", ticket.priority)
            db.commit()
            db.refresh(ticket)
    return ticket


@router.delete("/{ticket_id}", status_code=204)
def delete_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = JiraTicketRepository(db).get(ticket_id)
    if not ticket:
        raise NotFoundException("JiraTicket", ticket_id)
    if ticket.jira_key and "MOCK-" not in ticket.jira_key:
        try:
            jira_service.delete_issue(ticket.jira_key)
        except Exception:
            pass  # Delete locally even if Jira call fails
    db.delete(ticket)
    db.commit()


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
