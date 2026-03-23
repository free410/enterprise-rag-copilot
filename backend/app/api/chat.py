from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.rag_service import rag_service


router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> ChatResponse:
    return rag_service.chat(
        db=db,
        query=payload.query,
        provider=payload.provider,
        top_k=payload.top_k,
        user_id=current_user.id,
    )
