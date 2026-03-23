from sqlalchemy.orm import Session

from app.models.chunk import Chunk
from app.models.document import Document
from app.schemas.chat import RetrievedChunk
from app.services.index_service import index_service


class RagRetriever:
    def retrieve(self, db: Session, query: str, top_k: int) -> list[RetrievedChunk]:
        hits = index_service.search(query=query, top_k=top_k)
        if not hits:
            return []

        results: list[RetrievedChunk] = []
        for hit in hits:
            chunk = db.get(Chunk, hit.get("chunk_db_id"))
            if chunk is None:
                continue
            document = db.get(Document, chunk.document_id)
            if document is None:
                continue

            results.append(
                RetrievedChunk(
                    chunk_id=chunk.chunk_id,
                    chunk_index=chunk.chunk_index,
                    score=float(hit.get("score", 0.0)),
                    content=chunk.content,
                    file_name=document.file_name,
                    file_path=document.file_path,
                    file_type=document.file_type,
                )
            )
        return results


rag_retriever = RagRetriever()
