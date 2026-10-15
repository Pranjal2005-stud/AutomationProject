from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables FIRST, before any other imports
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models  # registers all ORM models with Base.metadata
from app.api.admin_routes import logs_router, settings_router
from app.api.auth_routes import router as auth_router
from app.api.dashboard_routes import router as dashboard_router
from app.api.email_routes import router as email_router
from app.api.gmail_routes import router as gmail_router
from app.api.meeting_routes import router as meeting_router
from app.api.team_routes import router as team_router
from app.api.ticket_routes import router as ticket_router
from app.core.exceptions import AppException
from app.core.logging import get_logger
from app.core.scheduler import start_scheduler, stop_scheduler
from app.database.connection import engine
from app.database.base import Base
from app.middleware.exception_handler import app_exception_handler, unhandled_exception_handler
from app.middleware.logging_middleware import RequestLoggingMiddleware

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")

    # Apply any missing columns that migrations may not have run
    from sqlalchemy import text
    missing_cols = [
        ("meetings", "team_names",    "ALTER TABLE meetings ADD COLUMN team_names TEXT"),
        ("meetings", "calendar_link", "ALTER TABLE meetings ADD COLUMN calendar_link VARCHAR(500)"),
        ("meetings", "updated_at",    "ALTER TABLE meetings ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now()"),
    ]
    with engine.connect() as conn:
        for table, col, ddl in missing_cols:
            exists = conn.execute(text(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_name=:t AND column_name=:c"
            ), {"t": table, "c": col}).fetchone()
            if not exists:
                conn.execute(text(ddl))
                logger.info(f"Added missing column {table}.{col}")
        conn.commit()

    start_scheduler()
    yield
    stop_scheduler()


application = FastAPI(
    title="AI Operations Assistant",
    description="Intelligent Workplace Automation using LLMs",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
application.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging
application.add_middleware(RequestLoggingMiddleware)

# Exception handlers
application.add_exception_handler(AppException, app_exception_handler)
application.add_exception_handler(Exception, unhandled_exception_handler)

# Routers
application.include_router(auth_router)
application.include_router(email_router)
application.include_router(ticket_router)
application.include_router(meeting_router)
application.include_router(dashboard_router)
application.include_router(gmail_router)
application.include_router(team_router)
application.include_router(logs_router)
application.include_router(settings_router)


@application.get("/", tags=["Health"])
def health():
    return {"status": "ok", "service": "AI Operations Assistant"}


app = application
