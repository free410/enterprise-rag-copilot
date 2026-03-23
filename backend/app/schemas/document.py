from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    file_name: str
    file_path: str
    file_type: str
    source_type: str
    file_size: int
    status: str
    chunk_count: int
    uploaded_by: int | None
    last_error: str | None
    indexed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    items: list[DocumentRead]
    total: int


class ReindexResponse(BaseModel):
    scanned_files: int
    indexed_documents: int
    total_chunks: int
    vector_count: int


class DemoSourceOptionRead(BaseModel):
    key: str
    title: str
    url: str
    source: str
    summary: str
    default_selected: bool


class DemoSourceOptionsResponse(BaseModel):
    items: list[DemoSourceOptionRead]


class StartFetchCnDemoTaskRequest(BaseModel):
    site_keys: list[str] = Field(default_factory=list)
    custom_urls: list[str] = Field(default_factory=list)


class StartFetchCnDemoTaskResponse(BaseModel):
    task_id: str
    status: str
    message: str


class SourceFetchResultRead(BaseModel):
    key: str
    title: str
    url: str
    source: str
    status: str
    file_path: str | None = None
    message: str | None = None


class FetchCnDemoTaskStatusResponse(BaseModel):
    task_id: str
    status: str
    progress: int
    current_step: str
    started_at: str | None = None
    finished_at: str | None = None
    selected_sources: list[DemoSourceOptionRead]
    custom_urls: list[str]
    source_results: list[SourceFetchResultRead]
    local_documents: list[str]
    web_documents: list[str]
    web_fetch_errors: list[str]
    manifest_file: str | None = None
    scanned_files: int = 0
    indexed_documents: int = 0
    total_chunks: int = 0
    vector_count: int = 0
    error_message: str | None = None
    logs: list[str] = Field(default_factory=list)


class DeleteDocumentResponse(BaseModel):
    success: bool
    deleted_document_id: int


class IndexStatusResponse(BaseModel):
    status: str
    total_documents: int
    indexed_documents: int
    total_chunks: int
    vector_count: int
    embedding_dimension: int
    index_file_exists: bool
    metadata_file_exists: bool
    index_file_path: str
    metadata_file_path: str
    last_indexed_at: datetime | None
