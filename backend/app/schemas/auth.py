from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=128)


class UserInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserInfo


class RecentDocumentItem(BaseModel):
    id: int
    title: str
    file_name: str
    file_type: str
    source_type: str
    status: str
    updated_at: datetime


class RecentQuestionItem(BaseModel):
    id: int
    query: str
    model_used: str
    created_at: datetime


class DashboardSummaryResponse(BaseModel):
    total_users: int
    active_users: int
    current_user: str
    database_status: str
    api_version: str
    total_documents: int = 0
    total_chunks: int = 0
    indexed_documents: int = 0
    recent_question_count: int = 0
    available_models: list[str] = []
    backend_status: str = "running"
    index_status: str = "empty"
    model_status: str = "fallback"
    last_indexed_at: datetime | None = None
    recent_documents: list[RecentDocumentItem] = []
    recent_questions: list[RecentQuestionItem] = []


class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    database: str
    timestamp: datetime
