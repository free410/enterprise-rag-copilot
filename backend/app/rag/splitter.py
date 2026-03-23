import hashlib
import re
from dataclasses import dataclass

from app.core.config import settings
from app.rag.loaders import LoadedDocument


@dataclass(slots=True)
class TextChunk:
    chunk_id: str
    chunk_index: int
    content: str
    metadata: dict[str, str | int]


class TextSplitter:
    def __init__(self, chunk_size: int | None = None, chunk_overlap: int | None = None):
        self.chunk_size = chunk_size or settings.chunk_size
        self.chunk_overlap = chunk_overlap or settings.chunk_overlap

    def split_document(self, document: LoadedDocument) -> list[TextChunk]:
        paragraphs = [part.strip() for part in re.split(r"\n{2,}", document.text) if part.strip()]
        if not paragraphs:
            paragraphs = [document.text]

        windows = self._build_windows(paragraphs)
        path_hash = hashlib.md5(document.file_path.encode("utf-8")).hexdigest()[:12]

        return [
            TextChunk(
                chunk_id=f"{path_hash}-{index}",
                chunk_index=index,
                content=content,
                metadata={
                    "file_name": document.file_name,
                    "file_path": document.file_path,
                    "file_type": document.file_type,
                    "chunk_id": f"{path_hash}-{index}",
                },
            )
            for index, content in enumerate(windows)
            if content.strip()
        ]

    def _build_windows(self, paragraphs: list[str]) -> list[str]:
        chunks: list[str] = []
        current = ""

        for paragraph in paragraphs:
            for fragment in self._split_large_text(paragraph):
                if not current:
                    current = fragment
                    continue

                candidate = f"{current}\n\n{fragment}"
                if len(candidate) <= self.chunk_size:
                    current = candidate
                    continue

                chunks.append(current.strip())
                overlap_text = current[-self.chunk_overlap :] if self.chunk_overlap > 0 else ""
                current = f"{overlap_text}\n\n{fragment}".strip()

        if current.strip():
            chunks.append(current.strip())

        return chunks

    def _split_large_text(self, text: str) -> list[str]:
        if len(text) <= self.chunk_size:
            return [text]

        sentences = re.split(r"(?<=[。！？.!?])\s+|(?<=\n)", text)
        parts = [part.strip() for part in sentences if part.strip()]
        if len(parts) <= 1:
            return self._hard_split(text)

        fragments: list[str] = []
        current = ""
        for part in parts:
            candidate = f"{current} {part}".strip()
            if current and len(candidate) > self.chunk_size:
                fragments.append(current)
                overlap_text = current[-self.chunk_overlap :] if self.chunk_overlap > 0 else ""
                current = f"{overlap_text} {part}".strip()
            else:
                current = candidate

        if current:
            fragments.append(current)

        return fragments or self._hard_split(text)

    def _hard_split(self, text: str) -> list[str]:
        step = max(self.chunk_size - self.chunk_overlap, 1)
        return [text[i : i + self.chunk_size].strip() for i in range(0, len(text), step)]
