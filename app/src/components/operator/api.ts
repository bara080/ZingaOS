// Typed fetch helpers + response shapes for the EXISTING /api/operator/* routes.
// These routes are owned elsewhere and are NOT modified — this file only calls
// them. On 401 the browser is redirected to /login (mirrors the static console).

async function req<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...opts,
  });
  if (r.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('unauthenticated');
  }
  const data = (await r.json()) as T & { error?: string };
  if (!r.ok || data?.error) {
    throw new Error(data?.error || `request failed (${r.status})`);
  }
  return data as T;
}

function post<T>(url: string, body: unknown): Promise<T> {
  return req<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ── Response types ──────────────────────────────────────────────────────────
export type Analytics = {
  supply: { sourced: number; icp: number; signed: number };
  trust: { testimonials: number };
  demand: { bookings: number };
  send: { sent: number; failed: number; pending: number; total: number };
  scrape: { google: number; ig: number; tiktok: number };
};

export type SourceOption = { id: string; label: string; count: number; kind: string };
export type SourcesResponse = { sources: SourceOption[] };

export type Recipient = { id: number; email: string; biz: string; status: 'sent' | 'pending' };
export type Campaign = {
  src: string;
  recipients: Recipient[];
  sent: number;
  pending: number;
  failed: number;
  total: number;
};

export type LogsResponse = { audit: string[]; runs?: unknown[] };

export type ScrapeSource = 'google' | 'ig' | 'tiktok';
export type ScrapeStartResponse = { runId: string; datasetId: string; number: number };
export type ScrapeStatusResponse = { status: string };
export type ScrapeItem = {
  business: string;
  owner: string;
  email: string;
  phone: string;
  instagram: string;
  website: string;
  notes: string;
};
export type ScrapeResults = {
  items: ScrapeItem[];
  found: number;
  dropped: number;
  inserted: number;
  source: string;
  sourceTag: string;
  dbError: string | null;
};

export type SendBatchResponse = {
  sent: number;
  failed: number;
  marked?: number;
  remaining: number;
  results: { email: string; ok: boolean; error?: string }[];
  note?: string;
};

export type IgConversation = { igsid: string; username: string; snippet: string };
export type IgConversationsResponse = { conversations: IgConversation[] };
export type IgSendResponse = { ok: boolean; messageId: string };
export type IgProfile = { userId: string; username: string };
export type IgProfileResponse = { connected: boolean; profile: IgProfile | null };

// Stored conversation history (ops.ig_messages) captured by the Meta webhook.
export type IgThread = {
  igsid: string;
  username: string | null;
  last_text: string | null;
  last_at: string;
  msg_count: number;
};
export type IgThreadsResponse = { threads: IgThread[] };
export type IgMessage = {
  id: number;
  direction: 'in' | 'out';
  text: string | null;
  created_at: string;
};
export type IgThreadResponse = { igsid: string; messages: IgMessage[] };
export type IgDraftResponse = { draft: string; intent: string };

// ── Callers ─────────────────────────────────────────────────────────────────
export const operatorApi = {
  analytics: () => req<Analytics>('/api/operator/analytics'),
  sources: () => req<SourcesResponse>('/api/operator/sources'),
  campaign: (src: string) => req<Campaign>(`/api/operator/campaign?src=${encodeURIComponent(src)}`),
  logs: () => req<LogsResponse>('/api/operator/logs'),

  scrapeStart: (body: { source: ScrapeSource; query: string; number: number }) =>
    post<ScrapeStartResponse>('/api/operator/scrape/start', body),
  scrapeStatus: (runId: string) =>
    req<ScrapeStatusResponse>(`/api/operator/scrape/status?runId=${encodeURIComponent(runId)}`),
  scrapeResults: (dataset: string, source: ScrapeSource) =>
    req<ScrapeResults>(
      `/api/operator/scrape/results?dataset=${encodeURIComponent(dataset)}&source=${source}`,
    ),

  sendBatch: (body: { src: string; limit: number }) =>
    post<SendBatchResponse>('/api/operator/send-batch', body),

  igConversations: () => req<IgConversationsResponse>('/api/operator/ig/conversations'),
  igSend: (body: { igsid: string; text: string }) =>
    post<IgSendResponse>('/api/operator/ig/send', body),
  igProfile: () => req<IgProfileResponse>('/api/operator/ig/profile'),

  igThreads: () => req<IgThreadsResponse>('/api/operator/ig/threads'),
  igThread: (igsid: string) =>
    req<IgThreadResponse>(`/api/operator/ig/thread?igsid=${encodeURIComponent(igsid)}`),
  igDraft: (body: { igsid: string }) => post<IgDraftResponse>('/api/operator/ig/draft', body),
};
