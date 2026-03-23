import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import faiss
import numpy as np


class FaissVectorStore:
    def __init__(self, dimension: int, index_file: Path, metadata_file: Path):
        self.dimension = dimension
        self.index_file = index_file
        self.metadata_file = metadata_file
        self.index: faiss.IndexFlatIP = faiss.IndexFlatIP(self.dimension)
        self.metadata: list[dict[str, Any]] = []
        self.load()

    def build(self, embeddings: np.ndarray, metadata: list[dict[str, Any]]) -> None:
        self.index = faiss.IndexFlatIP(self.dimension)
        self.metadata = metadata

        if len(embeddings) > 0:
            vectors = np.asarray(embeddings, dtype=np.float32)
            self.index.add(vectors)

        self.save()

    def save(self) -> None:
        self.index_file.parent.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self.index, str(self.index_file))
        payload = {
            "dimension": self.dimension,
            "metadata": self.metadata,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        self.metadata_file.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def load(self) -> None:
        if self.index_file.exists():
            self.index = faiss.read_index(str(self.index_file))
        else:
            self.index = faiss.IndexFlatIP(self.dimension)

        if self.metadata_file.exists():
            payload = json.loads(self.metadata_file.read_text(encoding="utf-8"))
            self.metadata = payload.get("metadata", [])
        else:
            self.metadata = []

    def search(self, query_embedding: np.ndarray, top_k: int) -> list[dict[str, Any]]:
        if self.index.ntotal == 0 or not self.metadata:
            return []

        query = np.asarray(query_embedding, dtype=np.float32).reshape(1, -1)
        distances, indices = self.index.search(query, min(top_k, self.index.ntotal))

        results: list[dict[str, Any]] = []
        for score, index in zip(distances[0], indices[0], strict=False):
            if index < 0 or index >= len(self.metadata):
                continue
            result = dict(self.metadata[index])
            result["score"] = float(score)
            results.append(result)
        return results

    def status(self) -> dict[str, Any]:
        last_updated = None
        if self.metadata_file.exists():
            payload = json.loads(self.metadata_file.read_text(encoding="utf-8"))
            last_updated = payload.get("updated_at")

        return {
            "vector_count": int(self.index.ntotal),
            "dimension": self.dimension,
            "index_file_exists": self.index_file.exists(),
            "metadata_file_exists": self.metadata_file.exists(),
            "index_file_path": str(self.index_file),
            "metadata_file_path": str(self.metadata_file),
            "last_updated": last_updated,
        }
