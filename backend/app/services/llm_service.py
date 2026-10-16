import json
import re
import time
from typing import Optional

from groq import Groq

from app.core.config import get_settings
from app.core.exceptions import LLMParsingException, ExternalServiceException
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

MEETING_NOTES_PROMPT = """You are an AI assistant summarizing a completed meeting.

Meeting Title: {title}
Date: {date} at {time}
Duration: {duration} minutes
Participants: {participants}

Generate a concise meeting summary with:
1. A 2-3 sentence overview of what the meeting was about
2. Key discussion points (bullet list, max 5)
3. Action items (bullet list, max 5, format: "- [Owner if known] Action")

Keep it under 300 words. Plain text only, no markdown headers."""

EXTRACTION_PROMPT = """You are an IT helpdesk triage assistant. Analyze the email and extract structured ticket information.

Email Subject: {subject}
Email Body: {body}

Respond ONLY with a valid JSON object in this exact format:
{{
  "summary": "short one-line summary of the issue",
  "description": "detailed description of the problem",
  "priority": "Medium",
  "issue_type": "Task",
  "category": "IT",
  "confidence": 0.85
}}

Priority rules — choose carefully based on actual business impact:
- Highest: Complete system/service outage affecting all users, data loss, active security breach, payment system down
- High: Major feature broken for many users, significant performance degradation, security vulnerability (not yet exploited), critical deadline at risk
- Medium: Feature partially broken, affects some users, workaround exists, moderate inconvenience, integration issues
- Low: Minor bug, cosmetic issue, affects one or few users, easy workaround available, non-urgent request
- Lowest: Typo, UI spacing/alignment, documentation correction, nice-to-have suggestion, no functional impact

Examples:
- "Minor UI alignment issue on dashboard" → Lowest
- "Typo in footer" → Lowest
- "Suggestion to add dark mode" → Lowest
- "Non-urgent documentation correction" → Low
- "Unable to export report (workaround: download CSV)" → Low
- "Some users cannot login intermittently" → Medium
- "Payment gateway returning errors for 20% of transactions" → High
- "Production database is down" → Highest

Do NOT default to High or Highest unless the email clearly describes severe, widespread, or time-critical impact.
If the sender says "minor", "small", "cosmetic", "suggestion", "when you get a chance", or "no urgency" — use Low or Lowest.

Other rules:
- issue_type must be one of: Bug, Task, Feature, Epic
- category must be one of: IT, HR, Finance, Operations, Security, Other
- confidence is a float between 0 and 1
- Return ONLY the JSON object, no explanation, no markdown"""


class LLMService:
    def __init__(self):
        self._client: Optional[Groq] = None

    @property
    def client(self) -> Groq:
        if not self._client:
            if not settings.GROQ_API_KEY:
                raise ExternalServiceException("Groq", "GROQ_API_KEY not configured")
            self._client = Groq(api_key=settings.GROQ_API_KEY)
        return self._client

    def extract_ticket_data(self, subject: str, body: str, retries: int = 3) -> dict:
        prompt = EXTRACTION_PROMPT.format(subject=subject or "", body=body or "")

        for attempt in range(1, retries + 1):
            try:
                response = self.client.chat.completions.create(
                    model=settings.GROQ_MODEL,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.1,
                    max_tokens=512,
                )
                raw = response.choices[0].message.content.strip()
                return self._parse_json(raw)
            except LLMParsingException:
                if attempt == retries:
                    raise
                logger.warning(f"LLM parse failed attempt {attempt}/{retries}, retrying...")
                time.sleep(1)
            except Exception as e:
                logger.error(f"Groq API error: {e}")
                raise ExternalServiceException("Groq", str(e))

    def generate_meeting_notes(self, title: str, date: str, time: str, duration: int, participants: list) -> str:
        prompt = MEETING_NOTES_PROMPT.format(
            title=title, date=date or 'Unknown', time=time or 'Unknown',
            duration=duration, participants=', '.join(participants) if participants else 'Unknown'
        )
        try:
            response = self.client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4,
                max_tokens=600,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Meeting notes generation failed: {e}")
            raise ExternalServiceException("Groq", str(e))

    def _parse_json(self, raw: str) -> dict:
        # Strip markdown code fences if present
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            raise LLMParsingException(f"No JSON found in response: {raw[:200]}")
        try:
            data = json.loads(match.group())
        except json.JSONDecodeError as e:
            raise LLMParsingException(str(e))

        required = {"summary", "description", "priority", "issue_type", "category", "confidence"}
        missing = required - data.keys()
        if missing:
            raise LLMParsingException(f"Missing fields: {missing}")

        valid_priorities = {"Highest", "High", "Medium", "Low", "Lowest"}
        if data["priority"] not in valid_priorities:
            data["priority"] = "Medium"

        return data


llm_service = LLMService()
