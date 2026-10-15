from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.meeting import Meeting
from app.repositories.email_repository import EmailRepository
from app.repositories.jira_repository import JiraTicketRepository
from app.repositories.log_repository import MeetingRepository, ProcessingLogRepository
from app.schemas.dashboard import ChartDataPoint, DashboardCharts, DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _count_upcoming(db: Session) -> int:
    today = datetime.now().strftime("%Y-%m-%d")
    now_time = datetime.now().strftime("%H:%M")
    meetings = db.query(Meeting).filter(Meeting.status == "Scheduled").all()
    return sum(
        1 for m in meetings
        if m.meeting_date and m.meeting_time
        and m.meeting_date >= today
        and not (m.meeting_date == today and m.meeting_time < now_time)
    )

@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db)):
    email_repo = EmailRepository(db)
    jira_repo = JiraTicketRepository(db)
    meeting_repo = MeetingRepository(db)

    return DashboardStats(
        total_emails=email_repo.count(),
        pending_emails=email_repo.count_by_status("Pending"),
        processed_emails=email_repo.count_by_status("Processed"),
        tickets_created=jira_repo.count(),
        meetings_scheduled=_count_upcoming(db),
        todays_activity=email_repo.get_todays_count(),
    )


@router.get("/charts", response_model=DashboardCharts)
def get_charts(db: Session = Depends(get_db)):
    email_repo = EmailRepository(db)
    jira_repo = JiraTicketRepository(db)
    meeting_repo = MeetingRepository(db)

    return DashboardCharts(
        emails_per_day=[ChartDataPoint(**d) for d in email_repo.get_emails_per_day()],
        tickets_by_priority=[ChartDataPoint(**d) for d in jira_repo.count_by_priority()],
        tickets_by_category=[ChartDataPoint(**d) for d in jira_repo.count_by_category()],
        meetings_by_status=[ChartDataPoint(**d) for d in meeting_repo.count_by_status()],
    )


@router.get("/recent")
def get_recent(db: Session = Depends(get_db)):
    return {
        "emails": EmailRepository(db).get_recent(10),  # Show more recent emails
        "tickets": JiraTicketRepository(db).get_recent(5),
        "meetings": MeetingRepository(db).get_recent(5),
    }
