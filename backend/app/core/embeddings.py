import hashlib
import re

import numpy as np

from app.core.config import settings


class LocalHashEmbedding:
    def __init__(self, dimension: int | None = None):
        self.dimension = dimension or settings.embedding_dimension

    def embed_documents(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self.dimension), dtype=np.float32)
        vectors = [self._embed_text(text) for text in texts]
        return np.vstack(vectors).astype(np.float32)

    def embed_query(self, text: str) -> np.ndarray:
        return self._embed_text(text).astype(np.float32)

    def _embed_text(self, text: str) -> np.ndarray:
        vector = np.zeros(self.dimension, dtype=np.float32)
        tokens = self._tokenize(text)

        if not tokens:
            return vector

        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            for offset in range(0, 12, 4):
                bucket = int.from_bytes(digest[offset : offset + 2], "big") % self.dimension
                sign = 1.0 if digest[offset + 2] % 2 == 0 else -1.0
                weight = 1.0 + (digest[offset + 3] / 255.0)
                vector[bucket] += sign * weight

        norm = np.linalg.norm(vector)
        if norm > 0:
            vector /= norm
        return vector

    def _tokenize(self, text: str) -> list[str]:
        lowered = text.lower()
        word_tokens = re.findall(r"[a-z0-9_]+|[\u4e00-\u9fff]+", lowered)
        cjk_bigrams: list[str] = []

        for token in word_tokens:
            if any("\u4e00" <= char <= "\u9fff" for char in token) and len(token) > 1:
                cjk_bigrams.extend(token[i : i + 2] for i in range(len(token) - 1))

        return word_tokens + cjk_bigrams
