import time
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.email import Email
from app.models.jira_ticket import JiraTicket
from app.repositories.email_repository import EmailRepository
from app.repositories.jira_repository import JiraTicketRepository
from app.repositories.log_repository import ProcessingLogRepository
from app.services.gmail_service import gmail_service
from app.services.jira_service import jira_service
from app.services.llm_service import llm_service

logger = get_logger(__name__)


class EmailProcessor:
    def run(self, db: Session) -> dict:
        email_repo = EmailRepository(db)
        jira_repo = JiraTicketRepository(db)
        log_repo = ProcessingLogRepository(db)

        fetched, created, skipped, errors = 0, 0, 0, 0

        try:
            raw_emails = gmail_service.fetch_unread_emails(max_results=20)
            fetched = len(raw_emails)
        except Exception as e:
            log_repo.log("Gmail", "fetch_unread_emails", "failed", str(e))
            return {"fetched": 0, "created": 0, "skipped": 0, "errors": 1}

        for raw in raw_emails:
            gmail_id = raw.get("gmail_message_id")

            # Skip duplicates
            if email_repo.get_by_gmail_id(gmail_id):
                skipped += 1
                continue

            # Persist email
            email = Email(
                gmail_message_id=gmail_id,
                thread_id=raw.get("thread_id"),
                sender_name=raw.get("sender_name"),
                sender_email=raw.get("sender_email", ""),
                receiver_email=raw.get("receiver_email"),
                subject=raw.get("subject"),
                body=raw.get("body"),
                received_at=datetime.utcnow(),
                status="Processing",
            )
            email = email_repo.create(email)

            # LLM extraction
            try:
                t0 = time.time()
                ticket_data = llm_service.extract_ticket_data(email.subject, email.body)
                duration = int((time.time() - t0) * 1000)

                email.priority = ticket_data.get("priority")
                email.category = ticket_data.get("category")
                email_repo.update(email)

                log_repo.log("LLM", f"extract email_id={email.id}", "success", duration_ms=duration)
            except Exception as e:
                logger.error(f"LLM failed for email {email.id}: {e}")
                email.status = "LLM_Failed"
                email_repo.update(email)
                log_repo.log("LLM", f"extract email_id={email.id}", "failed", str(e))
                errors += 1
                continue

            # Jira creation
            try:
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
                jira_repo.create(ticket)

                email.status = "Processed"
                email.ticket_created = True
                email.jira_issue_key = result["jira_key"]
                email_repo.update(email)

                gmail_service.mark_as_read(gmail_id)
                log_repo.log("Jira", f"create_issue email_id={email.id}", "success", result["jira_key"])
                created += 1
            except Exception as e:
                logger.error(f"Jira failed for email {email.id}: {e}")
                email.status = "Jira_Failed"
                email_repo.update(email)
                log_repo.log("Jira", f"create_issue email_id={email.id}", "failed", str(e))
                errors += 1

        return {"fetched": fetched, "created": created, "skipped": skipped, "errors": errors}


email_processor = EmailProcessor()
