'use client';

// CRM data layer — reads REAL leads from the private ops.leads table via the
// existing, auth-gated /api/operator/leads route (no new DB path, no static
// data). Lead shape mirrors the operator_list_leads RPC columns.

export type Lead = {
  id: number;
  business: string | null;
  owner: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  website: string | null;
  borough: string | null;
  category: string | null;
  source: string | null;
  stage: string | null;
  verify_status: string | null;
  scraped_at: string | null;
  contacted_at: string | null;
  replied_at: string | null;
  notes: string | null;
  reviews: number | null;
  created_at: string | null;
};

export type LeadsResponse = {
  leads: Lead[];
  counts: { total: number; by_stage: Record<string, number> };
};

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...init });
  if (r.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('unauthenticated');
  }
  const data = (await r.json()) as T & { error?: string };
  if (!r.ok || (data as { error?: string })?.error) {
    throw new Error((data as { error?: string })?.error || `request failed (${r.status})`);
  }
  return data as T;
}

export type MarkSentResponse = { ok: boolean; messageId: number };

export type CrmStats = {
  total_leads: number;
  ready_to_contact: number;
  contacted: number;
  sent_total: number;
  sent_today: number;
  inbound_threads: number;
  replied: number;
  followups: number;
  qualified: number;
  won: number;
};
export type StatsResponse = { stats: CrmStats | null };

// Inbox reuses the existing IG conversation routes (ops.ig_messages).
export type IgThread = {
  igsid: string;
  username: string | null;
  last_text: string | null;
  last_direction: 'in' | 'out' | null;
  last_at: string;
  msg_count: number;
};
export type IgThreadsResponse = { threads: IgThread[] };
export type IgMessage = { id: number; direction: 'in' | 'out'; text: string | null; created_at: string };
export type IgThreadResponse = { igsid: string; messages: IgMessage[] };
export type IgDraftResponse = { draft: string; intent: string };
export type IgSendResponse = { ok: boolean; messageId: string };

export type Campaign = {
  id: number;
  name: string;
  platform: string;
  goal: string | null;
  source: string | null;
  send_mode: string;
  daily_limit: number;
  status: string;
  created_at: string;
  assigned: number;
  ready: number;
  sent: number;
  replies: number;
  qualified: number;
  won: number;
};
export type CampaignsResponse = { campaigns: Campaign[] };
export type Segment = { source: string; n: number; emailable: number };
export type SegmentsResponse = { segments: Segment[] };
export type CreateCampaignBody = {
  name: string;
  platform?: string;
  goal?: string;
  source?: string;
  sendMode?: string;
  dailyLimit?: number;
};

export type Agent = {
  id: number;
  name: string;
  role: string | null;
  tone: string | null;
  goal: string | null;
  system_prompt: string | null;
  model: string;
  temperature: number;
  escalation: string | null;
  enabled: boolean;
  actor: string | null;
  created_at: string;
};
export type AgentsResponse = { agents: Agent[] };
export type CreateAgentBody = {
  name: string;
  role?: string;
  tone?: string;
  goal?: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  escalation?: string;
};

export type AutomationRule = {
  id: number;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  actor: string | null;
  created_at: string;
};
export type AutomationsResponse = { rules: AutomationRule[] };
export type CreateAutomationBody = { name: string; trigger: string; action: string };

export type LeadActivity = {
  id: number;
  platform: string;
  send_mode: string;
  message: string | null;
  status: string;
  actor: string | null;
  sent_at: string;
};
export type LeadActivityResponse = { activity: LeadActivity[] };

export type TimeseriesPoint = { day: string; sent: number; replies: number };
export type PlatformSends = { platform: string; sent: number };
export type AnalyticsResponse = { timeseries: TimeseriesPoint[]; byPlatform: PlatformSends[] };

export const crmApi = {
  leads: (params?: { stage?: string; source?: string; q?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.stage) sp.set('stage', params.stage);
    if (params?.source) sp.set('source', params.source);
    if (params?.q) sp.set('q', params.q);
    sp.set('limit', String(params?.limit ?? 500));
    return req<LeadsResponse>(`/api/operator/leads?${sp.toString()}`);
  },
  markSent: (body: { leadId: number; platform?: string; sendMode?: string; message?: string }) =>
    req<MarkSentResponse>('/api/operator/crm/mark-sent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  stats: () => req<StatsResponse>('/api/operator/crm/stats'),

  igThreads: () => req<IgThreadsResponse>('/api/operator/ig/threads'),
  igThread: (igsid: string) =>
    req<IgThreadResponse>(`/api/operator/ig/thread?igsid=${encodeURIComponent(igsid)}`),
  igDraft: (igsid: string) =>
    req<IgDraftResponse>('/api/operator/ig/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ igsid }),
    }),
  igSend: (body: { igsid: string; text: string }) =>
    req<IgSendResponse>('/api/operator/ig/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  campaigns: () => req<CampaignsResponse>('/api/operator/crm/campaigns'),
  segments: () => req<SegmentsResponse>('/api/operator/crm/segments'),
  campaignCreate: (body: CreateCampaignBody) =>
    req<{ ok: boolean; id: number }>('/api/operator/crm/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  campaignSetStatus: (body: { id: number; status: 'active' | 'paused' }) =>
    req<{ ok: boolean; status: string }>('/api/operator/crm/campaigns/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  analytics: (days = 14) => req<AnalyticsResponse>(`/api/operator/crm/analytics?days=${days}`),

  leadActivity: (leadId: number) =>
    req<LeadActivityResponse>(`/api/operator/crm/lead-activity?leadId=${leadId}`),

  leadAdd: (body: { business?: string; instagram?: string; email?: string; source?: string }) =>
    req<{ added: boolean; id: number | null }>('/api/operator/crm/lead-add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  // First-touch intro DM draft (gpt-4o, template fallback server-side).
  dmDraft: (body: {
    name?: string;
    business?: string;
    category?: string;
    borough?: string;
    instruction?: string;
    base?: string;
  }) =>
    req<{ draft: string; source: string }>('/api/operator/crm/dm-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  agents: () => req<AgentsResponse>('/api/operator/crm/agents'),
  agentCreate: (body: CreateAgentBody) =>
    req<{ ok: boolean; id: number }>('/api/operator/crm/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  agentSetEnabled: (body: { id: number; enabled: boolean }) =>
    req<{ ok: boolean; enabled: boolean }>('/api/operator/crm/agents/enabled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  automations: () => req<AutomationsResponse>('/api/operator/crm/automations'),
  automationCreate: (body: CreateAutomationBody) =>
    req<{ ok: boolean; id: number }>('/api/operator/crm/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  automationSetEnabled: (body: { id: number; enabled: boolean }) =>
    req<{ ok: boolean; enabled: boolean }>('/api/operator/crm/automations/enabled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
};

// ── helpers shared by CRM views ────────────────────────────────────────────
export function leadName(l: Lead): string {
  return l.business?.trim() || l.owner?.trim() || l.instagram?.replace(/^@/, '') || `Lead #${l.id}`;
}

export function leadHandle(l: Lead): string | null {
  if (!l.instagram) return null;
  return l.instagram.startsWith('@') ? l.instagram : `@${l.instagram}`;
}

// Heuristic 0–99 lead score from the real signals we have (reviews, reachability,
// stage progression). Deterministic stand-in until a scoring agent is wired.
export function leadScore(l: Lead): number {
  let s = 0;
  if (l.reviews) s += Math.min(l.reviews, 50) / 50 * 40; // up to 40 from reviews
  if (l.email) s += 15;
  if (l.instagram) s += 15;
  const stage = (l.stage || '').toLowerCase();
  if (stage === 'contacted') s += 8;
  else if (stage === 'replied' || l.replied_at) s += 18;
  else if (stage === 'qualified') s += 26;
  else if (['signed', 'listed', 'won'].includes(stage)) s += 30;
  return Math.max(1, Math.min(99, Math.round(s)));
}

// Short "next action" label from the lead's stage (mirrors the DM Queue agent).
export function leadNextAction(l: Lead): string {
  const s = (l.stage || 'scraped').toLowerCase();
  if (s === 'replied' || l.replied_at) return 'Qualify';
  if (s === 'contacted') return 'Follow up';
  if (s === 'qualified') return 'Book demo';
  if (['signed', 'listed', 'won'].includes(s)) return 'Won';
  return l.instagram ? 'Send DM' : 'Email';
}

// Zinga-voice template DM derived from real lead fields (matches the email
// draft voice). Placeholder until the OpenAI Responses API is wired —
// see docs/outreach-crm-plan.md. Deterministic, no invented numbers.
export function draftDm(l: Lead): string {
  const name = leadName(l);
  const cat = (l.category || '').toLowerCase();
  const noun = cat.includes('barber')
    ? 'barbershops'
    : cat.includes('hair') || cat.includes('salon') || cat.includes('beauty')
      ? 'salons'
      : cat.includes('nail')
        ? 'nail studios'
        : cat.includes('photo')
          ? 'photographers'
          : cat.includes('massage') || cat.includes('spa')
            ? 'spas'
            : 'local businesses';
  const where = l.borough ? ` in ${l.borough}` : '';
  return (
    `Hey! Came across ${name}${where} and really love your work. ` +
    `We help ${noun} fill mid-week gaps and take bookings directly through Zinga — ` +
    `no cost to be listed. Open to a quick 2-min look?`
  );
}
