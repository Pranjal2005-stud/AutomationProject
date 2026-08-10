from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.core.logging import get_logger
from app.database.session import get_db

logger = get_logger(__name__)
scheduler = BackgroundScheduler()


def _poll_gmail():
    from app.services.email_processor import email_processor
    db = next(get_db())
    try:
        result = email_processor.run(db)
        logger.info(f"Gmail poll: {result}")
    except Exception as e:
        logger.error(f"Gmail poll job failed: {e}")
    finally:
        db.close()


def _retry_failed():
    from app.repositories.email_repository import EmailRepository
    from app.services.llm_service import llm_service
    from app.services.jira_service import jira_service
    from app.models.jira_ticket import JiraTicket

    db = next(get_db())
    try:
        repo = EmailRepository(db)
        failed = repo.get_by_status("LLM_Failed") + repo.get_by_status("Jira_Failed")
        for email in failed[:5]:  # process max 5 at a time
            try:
                ticket_data = llm_service.extract_ticket_data(email.subject, email.body)
                result = jira_service.create_issue(
                    summary=ticket_data["summary"],
                    description=ticket_data["description"],
                    priority=ticket_data["priority"],
                    issue_type=ticket_data["issue_type"],
                )
                ticket = JiraTicket(
                    jira_key=result["jira_key"],
                    summary=ticket_data["summary"],
                    description=ticket_data["description"],
                    priority=ticket_data["priority"],
                    issue_type=ticket_data["issue_type"],
                    email_id=email.id,
                )
                db.add(ticket)
                email.status = "Processed"
                email.ticket_created = True
                email.jira_issue_key = result["jira_key"]
                db.commit()
                logger.info(f"Retry succeeded for email {email.id}")
            except Exception as e:
                logger.warning(f"Retry failed for email {email.id}: {e}")
    finally:
        db.close()


def _cleanup_logs():
    from app.repositories.log_repository import ProcessingLogRepository
    from sqlalchemy import delete
    from app.models.processing_log import ProcessingLog
    from datetime import datetime, timedelta

    db = next(get_db())
    try:
        cutoff = datetime.utcnow() - timedelta(days=30)
        db.execute(delete(ProcessingLog).where(ProcessingLog.timestamp < cutoff))
        db.commit()
        logger.info("Old logs cleaned up")
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(_poll_gmail, IntervalTrigger(minutes=2), id="poll_gmail", replace_existing=True)
    scheduler.add_job(_retry_failed, IntervalTrigger(minutes=10), id="retry_failed", replace_existing=True)
    scheduler.add_job(_cleanup_logs, IntervalTrigger(hours=24), id="cleanup_logs", replace_existing=True)
    scheduler.start()
    logger.info("Background scheduler started")


def stop_scheduler():
    scheduler.shutdown(wait=False)
    logger.info("Background scheduler stopped")
