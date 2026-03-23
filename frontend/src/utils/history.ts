export interface ChatHistoryItem {
  id: string;
  query: string;
  answer: string;
  modelUsed: string;
  sourceFiles: string[];
  createdAt: string;
}

const CHAT_HISTORY_KEY = 'rag_copilot_chat_history';

export function getChatHistory(): ChatHistoryItem[] {
  const raw = localStorage.getItem(CHAT_HISTORY_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as ChatHistoryItem[];
  } catch {
    localStorage.removeItem(CHAT_HISTORY_KEY);
    return [];
  }
}

export function appendChatHistory(item: ChatHistoryItem): void {
  const next = [item, ...getChatHistory()].slice(0, 50);
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(next));
}

export function clearChatHistory(): void {
  localStorage.removeItem(CHAT_HISTORY_KEY);
}
