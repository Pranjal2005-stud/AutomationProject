from typing import Optional
import requests
from requests.auth import HTTPBasicAuth

from app.core.config import get_settings
from app.core.exceptions import ExternalServiceException
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

ISSUE_TYPE_MAP = {
    "Bug": "Task",
    "Incident": "Task",
    "Request": "Task",
    "Story": "Feature",
    "Task": "Task",
    "Feature": "Feature",
    "Epic": "Epic",
}

PRIORITY_MAP = {
    "Highest": "Highest",
    "High": "High",
    "Medium": "Medium",
    "Low": "Low",
    "Lowest": "Lowest",
}


class JiraService:
    @property
    def _auth(self) -> HTTPBasicAuth:
        return HTTPBasicAuth(settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)

    @property
    def _headers(self) -> dict:
        return {"Accept": "application/json", "Content-Type": "application/json"}

    def _url(self, path: str) -> str:
        return f"{settings.JIRA_URL.rstrip('/')}/rest/api/3/{path}"

    def create_issue(self, summary: str, description: str, priority: str, issue_type: str) -> dict:
        if not settings.JIRA_URL or not settings.JIRA_API_TOKEN:
            raise ExternalServiceException("Jira", "Jira credentials not configured")

        payload = {
            "fields": {
                "project": {"key": settings.JIRA_PROJECT_KEY},
                "summary": summary,
                "description": {
                    "type": "doc",
                    "version": 1,
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [{"type": "text", "text": description or ""}],
                        }
                    ],
                },
                "issuetype": {"name": ISSUE_TYPE_MAP.get(issue_type, "Task")},
                "priority": {"name": PRIORITY_MAP.get(priority, "Medium")},
            }
        }

        try:
            response = requests.post(
                self._url("issue"),
                json=payload,
                auth=self._auth,
                headers=self._headers,
                timeout=15,
            )
            response.raise_for_status()
            data = response.json()
            logger.info(f"Jira issue created: {data['key']}")
            return {"jira_key": data["key"], "jira_url": f"{settings.JIRA_URL.rstrip('/')}/browse/{data['key']}"}
        except requests.HTTPError as e:
            raise ExternalServiceException("Jira", f"HTTP {e.response.status_code}: {e.response.text}")
        except requests.RequestException as e:
            raise ExternalServiceException("Jira", str(e))

    def get_issue(self, jira_key: str) -> Optional[dict]:
        try:
            response = requests.get(
                self._url(f"issue/{jira_key}"),
                auth=self._auth,
                headers=self._headers,
                timeout=10,
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch Jira issue {jira_key}: {e}")
            return None


jira_service = JiraService()
