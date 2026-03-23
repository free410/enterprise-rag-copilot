import { request } from './request';

export interface DocumentItem {
  id: number;
  title: string;
  file_name: string;
  file_path: string;
  file_type: string;
  source_type: string;
  file_size: number;
  status: string;
  chunk_count: number;
  uploaded_by: number | null;
  last_error: string | null;
  indexed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentListResponse {
  items: DocumentItem[];
  total: number;
}

export interface ReindexResponse {
  scanned_files: number;
  indexed_documents: number;
  total_chunks: number;
  vector_count: number;
}

export interface DemoSourceOption {
  key: string;
  title: string;
  url: string;
  source: string;
  summary: string;
  default_selected: boolean;
}

export interface DemoSourceOptionsResponse {
  items: DemoSourceOption[];
}

export interface StartFetchCnDemoTaskPayload {
  site_keys: string[];
  custom_urls: string[];
}

export interface StartFetchCnDemoTaskResponse {
  task_id: string;
  status: string;
  message: string;
}

export interface SourceFetchResult {
  key: string;
  title: string;
  url: string;
  source: string;
  status: 'success' | 'failed';
  file_path?: string | null;
  message?: string | null;
}

export interface FetchCnDemoTaskStatusResponse {
  task_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  current_step: string;
  started_at?: string | null;
  finished_at?: string | null;
  selected_sources: DemoSourceOption[];
  custom_urls: string[];
  source_results: SourceFetchResult[];
  local_documents: string[];
  web_documents: string[];
  web_fetch_errors: string[];
  manifest_file?: string | null;
  scanned_files: number;
  indexed_documents: number;
  total_chunks: number;
  vector_count: number;
  error_message?: string | null;
  logs: string[];
}

export async function getDocuments() {
  const { data } = await request.get<DocumentListResponse>('/documents');
  return data;
}

export async function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await request.post<DocumentItem>('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
}

export async function reindexDocuments() {
  const { data } = await request.post<ReindexResponse>('/documents/reindex');
  return data;
}

export async function getCnDemoSourceOptions() {
  const { data } = await request.get<DemoSourceOptionsResponse>('/documents/fetch-cn-demo/options');
  return data;
}

export async function startFetchCnDemoTask(payload: StartFetchCnDemoTaskPayload) {
  const { data } = await request.post<StartFetchCnDemoTaskResponse>('/documents/fetch-cn-demo/tasks', payload);
  return data;
}

export async function getFetchCnDemoTaskStatus(taskId: string) {
  const { data } = await request.get<FetchCnDemoTaskStatusResponse>(`/documents/fetch-cn-demo/tasks/${taskId}`);
  return data;
}

export async function deleteDocument(documentId: number) {
  const { data } = await request.delete<{ success: boolean; deleted_document_id: number }>(
    `/documents/${documentId}`,
  );
  return data;
}
