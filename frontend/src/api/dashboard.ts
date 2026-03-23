import { request } from './request';

export interface RecentDocumentItem {
  id: number;
  title: string;
  file_name: string;
  file_type: string;
  source_type: string;
  status: string;
  updated_at: string;
}

export interface RecentQuestionItem {
  id: number;
  query: string;
  model_used: string;
  created_at: string;
}

export interface DashboardSummary {
  total_users: number;
  active_users: number;
  current_user: string;
  database_status: string;
  api_version: string;
  total_documents: number;
  total_chunks: number;
  indexed_documents: number;
  recent_question_count: number;
  available_models: string[];
  backend_status: string;
  index_status: string;
  model_status: string;
  last_indexed_at: string | null;
  recent_documents: RecentDocumentItem[];
  recent_questions: RecentQuestionItem[];
}

export async function getDashboardSummary() {
  const { data } = await request.get<DashboardSummary>('/dashboard/summary');
  return data;
}
