import { request } from './request';

export type ChatProvider = 'qwen' | 'deepseek' | 'llama' | 'mock';

export interface ChatPayload {
  query: string;
  provider: ChatProvider;
  top_k: number;
}

export interface RetrievedChunk {
  chunk_id: string;
  chunk_index: number;
  score: number;
  content: string;
  file_name: string;
  file_path: string;
  file_type: string;
}

export interface ChatResponse {
  answer: string;
  retrieved_chunks: RetrievedChunk[];
  source_files: string[];
  model_used: string;
  top_k: number;
}

export async function sendChatMessage(payload: ChatPayload) {
  const { data } = await request.post<ChatResponse>('/chat', payload);
  return data;
}
