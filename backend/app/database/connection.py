from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Ensure dotenv is loaded
load_dotenv()

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

try:
    settings = get_settings()
    logger.info(f"Database URL loaded: {settings.DATABASE_URL}")
    
    # MySQL specific settings
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        echo=False  # Set to True for SQL debugging
    )

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Test connection
    with engine.connect() as conn:
        from sqlalchemy import text
        result = conn.execute(text("SELECT 'MySQL Connected!' as status"))
        logger.info(f"✅ {result.fetchone()[0]}")
        
except Exception as e:
    logger.error(f"Database connection failed: {e}")
    raise Exception(f"Database setup failed: {e}")
