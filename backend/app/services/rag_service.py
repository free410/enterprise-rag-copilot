from sqlalchemy.orm import Session

from app.core.ollama_client import OllamaClient
from app.models.chat_history import ChatHistory
from app.rag.prompts import build_system_prompt, build_user_prompt
from app.rag.retriever import rag_retriever
from app.schemas.chat import ChatResponse


class RagService:
    def __init__(self) -> None:
        self.retriever = rag_retriever
        self.model_client = OllamaClient()

    def chat(
        self,
        db: Session,
        query: str,
        provider: str,
        top_k: int,
        user_id: int | None = None,
    ) -> ChatResponse:
        retrieved_chunks = self.retriever.retrieve(db=db, query=query, top_k=top_k)
        system_prompt = build_system_prompt()
        user_prompt = build_user_prompt(query=query, retrieved_chunks=retrieved_chunks)

        model_result = self.model_client.generate(
            provider=provider,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            retrieved_chunks=retrieved_chunks,
        )

        source_files = list(dict.fromkeys(chunk.file_path for chunk in retrieved_chunks))
        response = ChatResponse(
            answer=model_result.answer,
            retrieved_chunks=retrieved_chunks,
            source_files=source_files,
            model_used=model_result.model_used,
            top_k=top_k,
        )
        self._save_history(
            db=db,
            user_id=user_id,
            query=query,
            provider=provider,
            response=response,
        )
        return response

    def _save_history(
        self,
        db: Session,
        user_id: int | None,
        query: str,
        provider: str,
        response: ChatResponse,
    ) -> None:
        summary = " ".join(response.answer.split())
        history = ChatHistory(
            user_id=user_id,
            query=query,
            answer=response.answer,
            answer_summary=summary[:200] if summary else "暂无回答内容",
            model_used=response.model_used,
            provider=provider,
            source_files_json=response.source_files,
        )
        db.add(history)
        db.commit()
        db.refresh(history)


rag_service = RagService()
