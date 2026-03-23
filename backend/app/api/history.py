from sqlalchemy import select

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.models.chat_history import ChatHistory
from app.schemas.history import HistoryItem, HistoryListResponse


router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=HistoryListResponse)
def list_history(
    db: DbSession,
    current_user: CurrentUser,
) -> HistoryListResponse:
    stmt = (
        select(ChatHistory)
        .where(ChatHistory.user_id == current_user.id)
        .order_by(ChatHistory.created_at.desc())
        .limit(100)
    )
    records = list(db.scalars(stmt).all())

    return HistoryListResponse(
        items=[
            HistoryItem(
                id=record.id,
                query=record.query,
                answer_summary=record.answer_summary,
                model_used=record.model_used,
                provider=record.provider,
                source_files=record.source_files_json,
                created_at=record.created_at,
            )
            for record in records
        ],
        total=len(records),
    )
