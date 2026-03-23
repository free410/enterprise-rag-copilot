import { request } from './request';

export interface HistoryItem {
  id: number;
  query: string;
  answer_summary: string;
  model_used: string;
  provider: string;
  source_files: string[];
  created_at: string;
}

export interface HistoryListResponse {
  items: HistoryItem[];
  total: number;
}

export async function getHistory() {
  const { data } = await request.get<HistoryListResponse>('/history');
  return data;
}
