from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_SQLITE_PATH = os.path.join(BASE_DIR, "obe_system.db")

# Read DATABASE_URL from .env (defaults to PostgreSQL on port 5433, fallback to SQLite)
raw_db_url = os.getenv("DATABASE_URL", "").strip()

if raw_db_url.startswith("postgres://"):
    raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)

if raw_db_url:
    SQLALCHEMY_DATABASE_URL = raw_db_url
else:
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DEFAULT_SQLITE_PATH}"

# Configure Engine based on dialect
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False, "timeout": 15}
    )
else:
    # PostgreSQL Configuration
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

