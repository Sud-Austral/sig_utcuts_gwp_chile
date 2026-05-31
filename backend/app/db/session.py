"""SIG-UTCUTS Chile — Database session management."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

connect_args = {}
if settings.is_sqlite:
    connect_args["check_same_thread"] = False
elif "sslmode" not in settings.DATABASE_URL:
    # Railway proxy requiere SSL; se omite si el URL ya trae ?sslmode=...
    connect_args["sslmode"] = "require"

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
