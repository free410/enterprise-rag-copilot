from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.document import (
    DeleteDocumentResponse,
    DemoSourceOptionsResponse,
    DocumentListResponse,
    DocumentRead,
    FetchCnDemoTaskStatusResponse,
    IndexStatusResponse,
    ReindexResponse,
    StartFetchCnDemoTaskRequest,
    StartFetchCnDemoTaskResponse,
)
from app.services.demo_data_service import demo_data_service
from app.services.index_service import index_service


documents_router = APIRouter(prefix="/documents", tags=["documents"])
index_router = APIRouter(prefix="/index", tags=["index"])


@documents_router.get("", response_model=DocumentListResponse)
def list_documents(db: DbSession, _: CurrentUser) -> DocumentListResponse:
    documents = index_service.list_documents(db)
    return DocumentListResponse(
        items=[DocumentRead.model_validate(document) for document in documents],
        total=len(documents),
    )


@documents_router.post(
    "/upload",
    response_model=DocumentRead,
    status_code=status.HTTP_201_CREATED,
)
def upload_document(
    db: DbSession,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> DocumentRead:
    document = index_service.upload_document(db, file, uploaded_by=current_user.id)
    return DocumentRead.model_validate(document)


@documents_router.post("/reindex", response_model=ReindexResponse)
def reindex_documents(db: DbSession, _: CurrentUser) -> ReindexResponse:
    result = index_service.reindex_all(db)
    return ReindexResponse(**result)


@documents_router.get("/fetch-cn-demo/options", response_model=DemoSourceOptionsResponse)
def list_cn_demo_source_options(_: CurrentUser) -> DemoSourceOptionsResponse:
    return DemoSourceOptionsResponse(items=demo_data_service.get_source_options())


@documents_router.post("/fetch-cn-demo/tasks", response_model=StartFetchCnDemoTaskResponse)
def start_fetch_cn_demo_task(
    payload: StartFetchCnDemoTaskRequest,
    _: CurrentUser,
) -> StartFetchCnDemoTaskResponse:
    try:
        task_id = demo_data_service.start_fetch_task(
            site_keys=payload.site_keys,
            custom_urls=payload.custom_urls,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return StartFetchCnDemoTaskResponse(
        task_id=task_id,
        status="queued",
        message="抓取任务已创建，正在后台执行。",
    )


@documents_router.get("/fetch-cn-demo/tasks/{task_id}", response_model=FetchCnDemoTaskStatusResponse)
def get_fetch_cn_demo_task(task_id: str, _: CurrentUser) -> FetchCnDemoTaskStatusResponse:
    task = demo_data_service.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return FetchCnDemoTaskStatusResponse(**task)


@documents_router.delete("/{document_id}", response_model=DeleteDocumentResponse)
def delete_document(
    document_id: int,
    db: DbSession,
    _: CurrentUser,
) -> DeleteDocumentResponse:
    index_service.delete_document(db, document_id)
    return DeleteDocumentResponse(success=True, deleted_document_id=document_id)


@index_router.get("/status", response_model=IndexStatusResponse)
def get_index_status(db: DbSession, _: CurrentUser) -> IndexStatusResponse:
    return IndexStatusResponse(**index_service.get_index_status(db))
