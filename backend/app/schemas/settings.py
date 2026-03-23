from datetime import datetime

from pydantic import BaseModel, Field


class SettingsResponse(BaseModel):
    default_provider: str
    default_top_k: int
    data_dir: str
    index_dir: str
    updated_at: datetime | None = None


class SettingsUpdateRequest(BaseModel):
    default_provider: str = Field(..., pattern="^(qwen|deepseek|llama|mock)$")
    default_top_k: int = Field(..., ge=1, le=10)
    data_dir: str = Field(..., min_length=1, max_length=2048)
    index_dir: str = Field(..., min_length=1, max_length=2048)
