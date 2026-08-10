# AI Operations Assistant

Intelligent Workplace Automation using Large Language Models.

## What it does

- Reads incoming Gmail emails automatically every 2 minutes
- Uses Groq LLM to extract structured ticket information
- Auto-creates Jira issues from emails
- Schedules Google Calendar meetings with free-slot detection
- Centralized React dashboard for emails, tickets, meetings, and logs

## Tech Stack

**Backend:** FastAPI · SQLAlchemy · PostgreSQL · Alembic · APScheduler  
**AI:** Groq API (llama-3.3-70b-versatile)  
**Integrations:** Gmail API · Jira Cloud REST API · Google Calendar API  
**Frontend:** React · Vite · Tailwind CSS · Recharts · Axios

## Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # fill in your credentials
python -m alembic upgrade head
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Google OAuth

Place your `credentials.json` (from Google Cloud Console) inside the `backend/` folder.  
On first run, a browser window will open for OAuth consent. After that, `token.json` is auto-generated.

## Environment Variables

See `backend/.env.example` for all required variables.

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `GROQ_API_KEY` | From [console.groq.com](https://console.groq.com) |
| `JIRA_URL` | Your Atlassian domain |
| `JIRA_EMAIL` | Your Jira account email |
| `JIRA_API_TOKEN` | From Atlassian account settings |
| `JIRA_PROJECT_KEY` | Your Jira project key |
| `GMAIL_CREDENTIALS_FILE` | Path to Google OAuth credentials JSON |

## API Docs

Visit `http://localhost:8000/docs` after starting the backend.
