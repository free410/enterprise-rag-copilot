from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession
from app.core.ollama_client import OllamaClient
from app.models.chunk import Chunk
from app.models.chat_history import ChatHistory
from app.models.document import Document
from app.models.user import User
from app.schemas.auth import DashboardSummaryResponse, RecentDocumentItem, RecentQuestionItem
from app.core.config import settings


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: DbSession,
    current_user: CurrentUser,
) -> DashboardSummaryResponse:
    total_users = db.scalar(select(func.count(User.id))) or 0
    active_users = db.scalar(select(func.count(User.id)).where(User.is_active.is_(True))) or 0
    total_documents = db.scalar(select(func.count(Document.id))) or 0
    total_chunks = db.scalar(select(func.count(Chunk.id))) or 0
    indexed_documents = (
        db.scalar(select(func.count(Document.id)).where(Document.status == "indexed")) or 0
    )
    recent_cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    recent_question_count = (
        db.scalar(
            select(func.count(ChatHistory.id)).where(ChatHistory.created_at >= recent_cutoff)
        )
        or 0
    )
    last_indexed_at = db.scalar(select(func.max(Document.indexed_at)))
    model_state = OllamaClient().get_provider_status()
    index_status = "ready" if indexed_documents > 0 else "empty"

    recent_documents = list(
        db.scalars(
            select(Document)
            .order_by(Document.updated_at.desc())
            .limit(5)
        ).all()
    )
    recent_questions = list(
        db.scalars(
            select(ChatHistory)
            .where(ChatHistory.user_id == current_user.id)
            .order_by(ChatHistory.created_at.desc())
            .limit(5)
        ).all()
    )

    return DashboardSummaryResponse(
        total_users=total_users,
        active_users=active_users,
        current_user=current_user.username,
        database_status="ok",
        api_version=settings.app_version,
        total_documents=total_documents,
        total_chunks=total_chunks,
        indexed_documents=indexed_documents,
        recent_question_count=recent_question_count,
        available_models=model_state["available_providers"],
        backend_status="running",
        index_status=index_status,
        model_status=str(model_state["model_status"]),
        last_indexed_at=last_indexed_at,
        recent_documents=[
            RecentDocumentItem(
                id=item.id,
                title=item.title,
                file_name=item.file_name,
                file_type=item.file_type,
                source_type=item.source_type,
                status=item.status,
                updated_at=item.updated_at,
            )
            for item in recent_documents
        ],
        recent_questions=[
            RecentQuestionItem(
                id=item.id,
                query=item.query,
                model_used=item.model_used,
                created_at=item.created_at,
            )
            for item in recent_questions
        ],
    )
