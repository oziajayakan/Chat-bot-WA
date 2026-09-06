const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchJSON<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  getModels: () => fetchJSON<{ models: any[]; default: string }>('/api/models'),
  chat: (body: any) => fetchJSON<any>('/api/chat', { method: 'POST', body: JSON.stringify(body) }),
  getStats: () => fetchJSON<any>('/api/stats'),
  getSessions: () => fetchJSON<any>('/api/sessions'),
  getHistory: (userId: string) => fetchJSON<any>(`/api/history/${userId}`),
  getWhatsappStatus: () => fetchJSON<any>('/api/whatsapp/status'),
  reconnectWa: () => fetchJSON<any>('/api/whatsapp/reconnect', { method: 'POST' }),
  logoutWa: () => fetchJSON<any>('/api/whatsapp/logout', { method: 'POST' }),
  sendWa: (jid: string, message: string) =>
    fetchJSON<any>('/api/whatsapp/send', { method: 'POST', body: JSON.stringify({ jid, message }) }),
  getLogs: () => fetchJSON<any>('/api/logs'),
  clearLogs: () => fetchJSON<any>('/api/logs', { method: 'DELETE' })
};
