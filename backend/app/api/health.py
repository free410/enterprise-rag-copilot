from datetime import datetime, timezone

from fastapi import APIRouter
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.deps import DbSession
from app.core.config import settings
from app.schemas.auth import HealthResponse


router = APIRouter(prefix="/health", tags=["health"])


@router.get("", response_model=HealthResponse)
def health_check(db: DbSession) -> HealthResponse:
    database_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        database_status = "error"

    return HealthResponse(
        status="ok" if database_status == "ok" else "degraded",
        app_name=settings.app_name,
        version=settings.app_version,
        database=database_status,
        timestamp=datetime.now(timezone.utc),
    )
