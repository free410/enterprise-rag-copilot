from collections.abc import Generator

from sqlalchemy import create_engine, select
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings
from app.core.security import get_password_hash


class Base(DeclarativeBase):
    pass


engine = create_engine(
    settings.effective_database_url,
    connect_args={"check_same_thread": False}
    if settings.effective_database_url.startswith("sqlite")
    else {},
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app.models import ChatHistory, Chunk, Document, SystemSetting, User  # noqa: F401

    Base.metadata.create_all(bind=engine)


def ensure_admin_user() -> None:
    from app.models.user import User

    with SessionLocal() as db:
        admin = db.scalar(
            select(User).where(User.username == settings.initial_admin_username)
        )
        if admin:
            return

        admin = User(
            username=settings.initial_admin_username,
            email=settings.initial_admin_email,
            password_hash=get_password_hash(settings.initial_admin_password),
            is_active=True,
            is_superuser=True,
        )
        db.add(admin)
        db.commit()
