import { request } from './request';
import type { ChatProvider } from './chat';

export interface SystemSettings {
  default_provider: ChatProvider;
  default_top_k: number;
  data_dir: string;
  index_dir: string;
  updated_at: string | null;
}

export interface UpdateSystemSettingsPayload {
  default_provider: ChatProvider;
  default_top_k: number;
  data_dir: string;
  index_dir: string;
}

export async function getSettings() {
  const { data } = await request.get<SystemSettings>('/settings');
  return data;
}

export async function saveSettings(payload: UpdateSystemSettingsPayload) {
  const { data } = await request.post<SystemSettings>('/settings', payload);
  return data;
}
