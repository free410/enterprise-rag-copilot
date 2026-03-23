from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000)
    provider: str = Field(default="mock", pattern="^(qwen|deepseek|llama|mock)$")
    top_k: int = Field(default=4, ge=1, le=10)


class RetrievedChunk(BaseModel):
    chunk_id: str
    chunk_index: int
    score: float
    content: str
    file_name: str
    file_path: str
    file_type: str


class ChatResponse(BaseModel):
    answer: str
    retrieved_chunks: list[RetrievedChunk]
    source_files: list[str]
    model_used: str
    top_k: int
