import hashlib
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.embeddings import LocalHashEmbedding
from app.core.vector_store import FaissVectorStore
from app.models.chunk import Chunk
from app.models.document import Document
from app.rag.loaders import LoadedDocument, load_document, scan_data_directory
from app.rag.splitter import TextSplitter


class IndexService:
    def __init__(self) -> None:
        self.splitter = TextSplitter()
        self.embedding_model = LocalHashEmbedding()
        self.vector_store = FaissVectorStore(
            dimension=settings.embedding_dimension,
            index_file=settings.faiss_index_file,
            metadata_file=settings.faiss_metadata_file,
        )

    def list_documents(self, db: Session) -> list[Document]:
        stmt = select(Document).order_by(Document.updated_at.desc())
        return list(db.scalars(stmt).all())

    def upload_document(self, db: Session, upload_file: UploadFile, uploaded_by: int | None) -> Document:
        extension = Path(upload_file.filename or "").suffix.lower()
        if extension not in {".md", ".markdown", ".txt", ".json"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file type",
            )

        saved_path = self._save_upload(upload_file)
        loaded = load_document(saved_path, settings.data_dir)
        if not loaded:
            saved_path.unlink(missing_ok=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty or unreadable",
            )

        document = self._upsert_document(db, loaded, source_type="uploaded", uploaded_by=uploaded_by)
        self._refresh_document_chunks(db, document, loaded)
        self._rebuild_vector_store(db)
        db.commit()
        db.refresh(document)
        return document

    def reindex_all(self, db: Session) -> dict[str, int]:
        loaded_documents = scan_data_directory(settings.data_dir)
        existing_documents = {
            document.file_path: document for document in db.scalars(select(Document)).all()
        }
        seen_paths = set()

        for loaded in loaded_documents:
            seen_paths.add(loaded.file_path)
            existing = existing_documents.get(loaded.file_path)
            document = self._upsert_document(
                db,
                loaded,
                source_type=existing.source_type if existing else "scanned",
                uploaded_by=existing.uploaded_by if existing else None,
            )
            self._refresh_document_chunks(db, document, loaded)

        for file_path, document in existing_documents.items():
            if file_path in seen_paths:
                continue
            db.execute(delete(Chunk).where(Chunk.document_id == document.id))
            db.delete(document)

        db.flush()
        vector_count = self._rebuild_vector_store(db)
        db.commit()

        return {
            "scanned_files": len(loaded_documents),
            "indexed_documents": db.scalar(
                select(func.count(Document.id)).where(Document.status == "indexed")
            )
            or 0,
            "total_chunks": db.scalar(select(func.count(Chunk.id))) or 0,
            "vector_count": vector_count,
        }

    def delete_document(self, db: Session, document_id: int) -> None:
        document = db.get(Document, document_id)
        if document is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found",
            )

        file_path = settings.data_dir / document.file_path
        db.execute(delete(Chunk).where(Chunk.document_id == document.id))
        db.delete(document)
        db.flush()
        self._rebuild_vector_store(db)
        db.commit()

        if file_path.exists():
            file_path.unlink()

    def get_index_status(self, db: Session) -> dict[str, object]:
        self.vector_store.load()
        vector_status = self.vector_store.status()
        total_documents = db.scalar(select(func.count(Document.id))) or 0
        indexed_documents = (
            db.scalar(select(func.count(Document.id)).where(Document.status == "indexed")) or 0
        )
        total_chunks = db.scalar(select(func.count(Chunk.id))) or 0
        last_indexed_at = db.scalar(select(func.max(Document.indexed_at)))

        return {
            "status": "ready" if vector_status["vector_count"] > 0 else "empty",
            "total_documents": total_documents,
            "indexed_documents": indexed_documents,
            "total_chunks": total_chunks,
            "vector_count": vector_status["vector_count"],
            "embedding_dimension": settings.embedding_dimension,
            "index_file_exists": vector_status["index_file_exists"],
            "metadata_file_exists": vector_status["metadata_file_exists"],
            "index_file_path": vector_status["index_file_path"],
            "metadata_file_path": vector_status["metadata_file_path"],
            "last_indexed_at": last_indexed_at,
        }

    def search(self, query: str, top_k: int | None = None) -> list[dict]:
        self.vector_store.load()
        query_embedding = self.embedding_model.embed_query(query)
        return self.vector_store.search(query_embedding, top_k or settings.default_top_k)

    def _save_upload(self, upload_file: UploadFile) -> Path:
        safe_name = Path(upload_file.filename or "upload.txt").name
        target_path = settings.uploads_dir / f"{uuid4().hex}_{safe_name}"
        content = upload_file.file.read()
        target_path.write_bytes(content)
        upload_file.file.close()
        return target_path

    def _upsert_document(
        self,
        db: Session,
        loaded: LoadedDocument,
        source_type: str,
        uploaded_by: int | None,
    ) -> Document:
        document = db.scalar(select(Document).where(Document.file_path == loaded.file_path))
        content_hash = hashlib.sha256(loaded.text.encode("utf-8")).hexdigest()
        absolute_path = settings.data_dir / loaded.file_path
        file_size = absolute_path.stat().st_size if absolute_path.exists() else len(loaded.text.encode("utf-8"))

        if document is None:
            document = Document(
                title=loaded.title,
                file_name=loaded.file_name,
                file_path=loaded.file_path,
                file_type=loaded.file_type,
                source_type=source_type,
                content_hash=content_hash,
                file_size=file_size,
                status="processing",
                uploaded_by=uploaded_by,
            )
            db.add(document)
            db.flush()
            return document

        document.title = loaded.title
        document.file_name = loaded.file_name
        document.file_type = loaded.file_type
        document.source_type = source_type
        document.content_hash = content_hash
        document.file_size = file_size
        document.status = "processing"
        document.last_error = None
        if uploaded_by is not None:
            document.uploaded_by = uploaded_by
        db.flush()
        return document

    def _refresh_document_chunks(
        self,
        db: Session,
        document: Document,
        loaded: LoadedDocument,
    ) -> None:
        text_chunks = self.splitter.split_document(loaded)
        db.execute(delete(Chunk).where(Chunk.document_id == document.id))

        for text_chunk in text_chunks:
            chunk_hash = hashlib.sha256(text_chunk.content.encode("utf-8")).hexdigest()
            chunk = Chunk(
                document_id=document.id,
                chunk_id=text_chunk.chunk_id,
                chunk_index=text_chunk.chunk_index,
                content=text_chunk.content,
                metadata_json=text_chunk.metadata,
                content_hash=chunk_hash,
            )
            db.add(chunk)

        document.chunk_count = len(text_chunks)
        document.status = "indexed"
        document.indexed_at = datetime.now(timezone.utc)
        document.last_error = None
        db.flush()

    def _rebuild_vector_store(self, db: Session) -> int:
        chunks = list(db.scalars(select(Chunk).order_by(Chunk.document_id, Chunk.chunk_index)).all())
        if not chunks:
            self.vector_store.build(
                embeddings=self.embedding_model.embed_documents([]),
                metadata=[],
            )
            return 0

        texts = [chunk.content for chunk in chunks]
        embeddings = self.embedding_model.embed_documents(texts)
        metadata = []

        for chunk in chunks:
            document = db.get(Document, chunk.document_id)
            metadata.append(
                {
                    "document_id": chunk.document_id,
                    "chunk_db_id": chunk.id,
                    "chunk_id": chunk.chunk_id,
                    "chunk_index": chunk.chunk_index,
                    "file_name": document.file_name if document else chunk.metadata_json.get("file_name"),
                    "file_path": document.file_path if document else chunk.metadata_json.get("file_path"),
                    "file_type": document.file_type if document else chunk.metadata_json.get("file_type"),
                }
            )

        self.vector_store.build(embeddings=embeddings, metadata=metadata)
        return len(metadata)


index_service = IndexService()
