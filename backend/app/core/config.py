from functools import lru_cache
from pathlib import Path
import tempfile
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"


class Settings(BaseSettings):
    app_name: str = "Enterprise Knowledge RAG Copilot API"
    app_version: str = "0.1.0"
    debug: bool = True
    api_prefix: str = "/api"

    host: str = "0.0.0.0"
    port: int = 8000

    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8

    database_url: str | None = None
    vector_store_dir_override: str | None = None
    chunk_size: int = 800
    chunk_overlap: int = 120
    embedding_dimension: int = 384
    default_top_k: int = 5
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_timeout_seconds: int = 60
    ollama_qwen_model: str = "qwen2.5:7b"
    ollama_deepseek_model: str = "deepseek-r1:7b"
    ollama_llama_model: str = "llama3.1:8b"

    initial_admin_username: str = "admin"
    initial_admin_password: str = "change-this-password"
    initial_admin_email: str = "admin@example.local"

    cors_origins: List[str] = Field(default_factory=lambda: ["*"])

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        env_prefix="RAG_COPILOT_",
    )

    @property
    def effective_database_url(self) -> str:
        if self.database_url:
            return self.database_url

        DATA_DIR.mkdir(parents=True, exist_ok=True)
        sqlite_path = DATA_DIR / "rag_copilot.db"
        return f"sqlite:///{sqlite_path.as_posix()}"

    @property
    def data_dir(self) -> Path:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        return DATA_DIR

    @property
    def uploads_dir(self) -> Path:
        uploads_dir = self.data_dir / "uploads"
        uploads_dir.mkdir(parents=True, exist_ok=True)
        return uploads_dir

    @property
    def vector_store_dir(self) -> Path:
        if self.vector_store_dir_override:
            vector_dir = Path(self.vector_store_dir_override)
        else:
            vector_dir = Path(tempfile.gettempdir()) / "enterprise_rag_copilot_faiss"
        vector_dir.mkdir(parents=True, exist_ok=True)
        return vector_dir

    @property
    def faiss_index_file(self) -> Path:
        return self.vector_store_dir / "knowledge.index"

    @property
    def faiss_metadata_file(self) -> Path:
        return self.vector_store_dir / "knowledge.meta.json"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
