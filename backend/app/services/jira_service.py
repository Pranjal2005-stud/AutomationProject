from typing import Optional
import requests
from requests.auth import HTTPBasicAuth
import uuid
from datetime import datetime

from app.core.config import get_settings
from app.core.exceptions import ExternalServiceException
from app.core.logging import get_logger

logger = get_logger(__name__)

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
        return HTTPBasicAuth(get_settings().JIRA_EMAIL, get_settings().JIRA_API_TOKEN)

    @property
    def _headers(self) -> dict:
        return {"Accept": "application/json", "Content-Type": "application/json"}

    def _url(self, path: str) -> str:
        return f"{get_settings().JIRA_URL.rstrip('/')}/rest/api/3/{path}"

    def create_issue(self, summary: str, description: str, priority: str, issue_type: str) -> dict:
        s = get_settings()
        if not s.JIRA_URL or not s.JIRA_API_TOKEN:
            raise ExternalServiceException("Jira", "Jira credentials not configured")

        if "your-company.atlassian.net" in s.JIRA_URL:
            mock_key = f"MOCK-{str(uuid.uuid4())[:8].upper()}"
            logger.info(f"🎭 Mock Jira ticket created: {mock_key} (Real Jira not configured)")
            return {"jira_key": mock_key, "jira_url": f"https://mock-jira.com/browse/{mock_key}"}

        payload = {
            "fields": {
                "project": {"key": s.JIRA_PROJECT_KEY},
                "summary": summary,
                "description": {
                    "type": "doc", "version": 1,
                    "content": [{"type": "paragraph", "content": [{"type": "text", "text": description or ""}]}],
                },
                "issuetype": {"name": ISSUE_TYPE_MAP.get(issue_type, "Task")},
                "priority": {"name": PRIORITY_MAP.get(priority, "Medium")},
            }
        }
        try:
            response = requests.post(
                self._url("issue"), json=payload, auth=self._auth, headers=self._headers, timeout=15,
            )
            response.raise_for_status()
            data = response.json()
            logger.info(f"Jira issue created: {data['key']}")
            return {"jira_key": data["key"], "jira_url": f"{s.JIRA_URL.rstrip('/')}/browse/{data['key']}"}
        except requests.HTTPError as e:
            raise ExternalServiceException("Jira", f"HTTP {e.response.status_code}: {e.response.text}")
        except requests.RequestException as e:
            raise ExternalServiceException("Jira", str(e))

    def search_issues(self, start_at: int = 0, max_results: int = 50) -> list:
        s = get_settings()
        if not s.JIRA_URL or not s.JIRA_API_TOKEN:
            return []
        auth = HTTPBasicAuth(s.JIRA_EMAIL, s.JIRA_API_TOKEN)
        all_issues = []
        next_token = None

        while True:
            body = {
                "jql": f"project={s.JIRA_PROJECT_KEY} ORDER BY created DESC",
                "maxResults": max_results,
                "fields": ["summary", "description", "priority", "issuetype", "status"],
            }
            if next_token:
                body["nextPageToken"] = next_token

            try:
                response = requests.post(
                    f"{s.JIRA_URL.rstrip('/')}/rest/api/3/search/jql",
                    json=body, auth=auth, headers=self._headers, timeout=15,
                )
                response.raise_for_status()
                data = response.json()
                issues = data.get("issues", [])
                all_issues.extend(issues)
                if data.get("isLast", True) or not issues:
                    break
                next_token = data.get("nextPageToken")
                if not next_token:
                    break
            except Exception as e:
                logger.error(f"Jira search failed: {e}")
                break

        return all_issues
    def update_priority(self, jira_key: str, priority: str) -> None:
        s = get_settings()
        try:
            response = requests.put(
                f"{s.JIRA_URL.rstrip('/')}/rest/api/3/issue/{jira_key}",
                json={"fields": {"priority": {"name": PRIORITY_MAP.get(priority, "Medium")}}},
                auth=HTTPBasicAuth(s.JIRA_EMAIL, s.JIRA_API_TOKEN),
                headers=self._headers,
                timeout=10,
            )
            response.raise_for_status()
            logger.info(f"Jira priority updated: {jira_key} → {priority}")
        except Exception as e:
            logger.error(f"Failed to update Jira priority for {jira_key}: {e}")

    def add_comment(self, jira_key: str, body: str) -> Optional[str]:
        """Add a comment to a Jira issue. Returns comment ID or None."""
        if "MOCK-" in jira_key:
            logger.info(f"Mock Jira comment added to {jira_key}")
            return f"mock-comment-{jira_key}"
        try:
            response = requests.post(
                self._url(f"issue/{jira_key}/comment"),
                json={"body": {"type": "doc", "version": 1, "content": [{"type": "paragraph", "content": [{"type": "text", "text": body}]}]}},
                auth=self._auth, headers=self._headers, timeout=15,
            )
            response.raise_for_status()
            return response.json().get("id")
        except Exception as e:
            logger.error(f"Failed to add Jira comment to {jira_key}: {e}")
            return None

    def delete_issue(self, jira_key: str) -> None:
        """Delete a Jira issue. No-op for mock keys."""
        if "MOCK-" in jira_key:
            logger.info(f"Mock Jira issue deleted: {jira_key}")
            return
        try:
            response = requests.delete(
                self._url(f"issue/{jira_key}"),
                auth=self._auth, headers=self._headers, timeout=10,
            )
            response.raise_for_status()
            logger.info(f"Jira issue deleted: {jira_key}")
        except Exception as e:
            logger.error(f"Failed to delete Jira issue {jira_key}: {e}")
            raise ExternalServiceException("Jira", str(e))

    def get_issue(self, jira_key: str) -> Optional[dict]:
        if "MOCK-" in jira_key:
            return {"key": jira_key, "fields": {"summary": "Mock ticket", "status": {"name": "Open"}}}
        try:
            response = requests.get(
                self._url(f"issue/{jira_key}"),
                auth=self._auth, headers=self._headers, timeout=10,
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch Jira issue {jira_key}: {e}")
            return None


jira_service = JiraService()
