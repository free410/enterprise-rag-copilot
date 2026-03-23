from datetime import datetime

from pydantic import BaseModel, ConfigDict


class HistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    query: str
    answer_summary: str
    model_used: str
    provider: str
    source_files: list[str]
    created_at: datetime


class HistoryListResponse(BaseModel):
    items: list[HistoryItem]
    total: int
