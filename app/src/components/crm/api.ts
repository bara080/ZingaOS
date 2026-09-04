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

// Messenger channel — mirrors the IG shape but keyed by the sender's PSID
// (page-scoped id). Backed by ops.messenger_messages via operator_messenger_*
// RPCs. Same Meta app + webhook as IG (object='page'); sends via the Page token.
export type MessengerThread = {
  psid: string;
  sender_name: string | null;
  lead_id: number | null;
  last_text: string | null;
  last_direction: 'in' | 'out' | null;
  last_at: string;
  msg_count: number;
};
export type MessengerThreadsResponse = { threads: MessengerThread[] };
export type MessengerMessage = {
  id: number;
  direction: 'in' | 'out';
  body: string | null;
  attachments: unknown[] | null;
  created_at: string;
};
export type MessengerThreadResponse = { psid: string; messages: MessengerMessage[] };
export type MessengerDraftResponse = { draft: string; intent: string; source: string };
export type MessengerSendResponse = { ok: boolean; messageId: string };

// Email channel — mirrors the IG shape but keyed by the CONTACT'S email address.
// Backed by ops.email_messages via the operator_email_* RPCs.
export type EmailThread = {
  contact: string;
  name: string | null;
  last_subject: string | null;
  last_text: string | null;
  last_at: string;
  last_direction: 'in' | 'out' | null;
  msg_count: number;
};
export type EmailThreadsResponse = { threads: EmailThread[] };
export type EmailMessage = {
  id: number;
  direction: 'in' | 'out';
  subject: string | null;
  body: string | null;
  created_at: string;
};
export type EmailThreadResponse = { contact: string; messages: EmailMessage[] };
export type EmailDraftResponse = { draft: string; subject?: string; source: string };
export type EmailSendResponse = { ok: boolean; id: number | null };
export type EmailPollResponse = { fetched: number; stored: number; skipped: number };

// SMS channel — consent-gated (TCPA + A2P 10DLC). Keyed by the CONTACT'S phone
// (E.164). Backed by ops.sms_messages + ops.sms_consent via operator_sms_* RPCs.
export type SmsConsentStatus = 'opted_in' | 'opted_out' | 'unknown';
export type SmsThread = {
  phone: string;
  name: string | null;
  last_text: string | null;
  last_at: string;
  last_direction: 'in' | 'out' | null;
  msg_count: number;
  status: SmsConsentStatus;
};
export type SmsThreadsResponse = { threads: SmsThread[] };
export type SmsMessage = { id: number; direction: 'in' | 'out'; body: string | null; created_at: string };
export type SmsThreadResponse = { phone: string; messages: SmsMessage[] };
export type SmsConsent = {
  id: number;
  lead_id: number | null;
  phone: string;
  name: string | null;
  source: string | null;
  status: 'opted_in' | 'opted_out';
  opted_in_at: string | null;
  opted_out_at: string | null;
  created_at: string;
};
export type SmsConsentResponse = { consent: SmsConsent[]; configured: boolean };
export type SmsSendResponse = { ok: boolean; id: number | null; providerId: string };
export type SmsDraftResponse = { draft: string; source: string };

// WhatsApp channel — consent-gated (Meta policy opt-in + templates). Keyed by
// the CONTACT'S phone (E.164). Backed by ops.whatsapp_messages +
// ops.whatsapp_consent via operator_whatsapp_* RPCs. Faithful copy of the SMS
// channel, sending via the Meta WhatsApp Business Cloud API.
export type WhatsAppConsentStatus = 'opted_in' | 'opted_out' | 'unknown';
export type WhatsAppThread = {
  phone: string;
  name: string | null;
  last_text: string | null;
  last_at: string;
  last_direction: 'in' | 'out' | null;
  msg_count: number;
  status: WhatsAppConsentStatus;
};
export type WhatsAppThreadsResponse = { threads: WhatsAppThread[] };
export type WhatsAppMessage = { id: number; direction: 'in' | 'out'; body: string | null; created_at: string };
export type WhatsAppThreadResponse = { phone: string; messages: WhatsAppMessage[] };
export type WhatsAppConsent = {
  id: number;
  lead_id: number | null;
  phone: string;
  name: string | null;
  source: string | null;
  status: 'opted_in' | 'opted_out';
  opted_in_at: string | null;
  opted_out_at: string | null;
  created_at: string;
};
export type WhatsAppConsentResponse = { consent: WhatsAppConsent[]; configured: boolean };
export type WhatsAppSendResponse = { ok: boolean; id: number | null; providerId: string };
export type WhatsAppDraftResponse = { draft: string; source: string };

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

// ── Email campaign engine (durable relational sends) ────────────────────────
export type EmailEngineCampaign = {
  id: string;
  name: string;
  status: string;
  current_version_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
export type EmailEngineVersion = { id: string; version: number };
export type EmailRunProgress = {
  total: number;
  accepted: number;
  failed: number;
  pending: number;
  suppressed: number;
};
export type EmailEngineRun = {
  id: string;
  campaign_id: string;
  campaign_version_id: string;
  status: string;
  audience_mode: string;
  current_stage: number;
  audience_count: number;
  created_at: string;
  progress?: EmailRunProgress;
};
export type EmailRunStage = {
  stage: number;
  label: string;
  total: number;
  accepted: number;
  failed: number;
  pending: number;
  suppressed: number;
  status: string;
};
export type EmailRunEvent = {
  id: number;
  event_type: string;
  data: Record<string, unknown>;
  created_at: string;
};
export type EmailRunDetail = {
  run: EmailEngineRun;
  progress: Record<string, number>;
  events: EmailRunEvent[];
  stages: EmailRunStage[];
};
export type EmailRunRecipient = {
  id: string;
  normalized_email: string;
  status: string;
  stage_number: number;
  attempt_count: number;
  provider: string | null;
  provider_message_id: string | null;
  last_error_message: string | null;
  accepted_at: string | null;
};
export type EmailRecipientsResponse = {
  recipients: EmailRunRecipient[];
  total: number;
  page: number;
  limit: number;
};
export type EmailDrainOutcome = {
  done?: boolean;
  paused?: boolean;
  gated?: boolean;
  stopped?: boolean;
  advanced?: boolean;
  capReached?: boolean;
  sentNow?: number;
};
export type EmailDrainResponse = {
  outcome: EmailDrainOutcome;
  progress: Record<string, number> | null;
  status: string | null;
};
export type EmailCampaignsResponse = { campaigns: EmailEngineCampaign[] };
export type EmailRunsResponse = { runs: EmailEngineRun[] };
export type CreateEmailCampaignBody = {
  name: string;
  subject?: string;
  html?: string;
  text?: string;
  senderKey?: string;
  replyTo?: string;
};
export type LaunchEmailRunBody = {
  versionId?: string;
  audienceMode?: string;
  audienceFilter?: { source?: string; stage?: string; category?: string; borough?: string; limit?: number };
  duplicatePolicy?: string;
  stagePlan?: Array<{ limit?: number; label?: string; gate?: string }>;
  dispatchChunkSize?: number;
  sourceRunId?: string;
  priority?: number;
};

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

  // ── Messenger (Facebook Page DMs · same Meta app as IG) ──────────────────────
  messengerThreads: () => req<MessengerThreadsResponse>('/api/operator/messenger/threads'),
  messengerThread: (psid: string) =>
    req<MessengerThreadResponse>(`/api/operator/messenger/thread?psid=${encodeURIComponent(psid)}`),
  messengerDraft: (psid: string) =>
    req<MessengerDraftResponse>('/api/operator/messenger/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ psid }),
    }),
  messengerSend: (body: { psid: string; text: string }) =>
    req<MessengerSendResponse>('/api/operator/messenger/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  emailThreads: () => req<EmailThreadsResponse>('/api/operator/email/threads'),
  emailThread: (contact: string) =>
    req<EmailThreadResponse>(`/api/operator/email/thread?contact=${encodeURIComponent(contact)}`),
  emailDraft: (contact: string) =>
    req<EmailDraftResponse>('/api/operator/email/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact }),
    }),
  emailSend: (body: { contact: string; subject: string; body: string; inReplyTo?: string }) =>
    req<EmailSendResponse>('/api/operator/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  emailPoll: () => req<EmailPollResponse>('/api/operator/email/poll', { method: 'POST' }),

  // ── SMS (consent-gated) ─────────────────────────────────────────────────────
  smsThreads: () => req<SmsThreadsResponse>('/api/operator/sms/threads'),
  smsThread: (phone: string) =>
    req<SmsThreadResponse>(`/api/operator/sms/thread?phone=${encodeURIComponent(phone)}`),
  smsSend: (body: { to: string; text: string }) =>
    req<SmsSendResponse>('/api/operator/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  smsDraft: (body: { name?: string; business?: string; category?: string; borough?: string; base?: string; instruction?: string }) =>
    req<SmsDraftResponse>('/api/operator/sms/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  smsConsentList: () => req<SmsConsentResponse>('/api/operator/sms/consent'),
  smsConsentAdd: (body: { phone: string; name?: string; leadId?: number; source?: string }) =>
    req<{ ok: boolean; id: number | null }>('/api/operator/sms/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  smsConsentOptout: (body: { phone: string }) =>
    req<{ ok: boolean; id: number | null }>('/api/operator/sms/consent/optout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  // ── WhatsApp (consent-gated · Meta Cloud API) ────────────────────────────────
  whatsappThreads: () => req<WhatsAppThreadsResponse>('/api/operator/whatsapp/threads'),
  whatsappThread: (phone: string) =>
    req<WhatsAppThreadResponse>(`/api/operator/whatsapp/thread?phone=${encodeURIComponent(phone)}`),
  whatsappSend: (body: { to: string; text: string }) =>
    req<WhatsAppSendResponse>('/api/operator/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  whatsappDraft: (body: { name?: string; business?: string; category?: string; borough?: string; base?: string; instruction?: string }) =>
    req<WhatsAppDraftResponse>('/api/operator/whatsapp/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  whatsappConsentList: () => req<WhatsAppConsentResponse>('/api/operator/whatsapp/consent'),
  whatsappConsentAdd: (body: { phone: string; name?: string; leadId?: number; source?: string }) =>
    req<{ ok: boolean; id: number | null }>('/api/operator/whatsapp/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  whatsappConsentOptout: (body: { phone: string }) =>
    req<{ ok: boolean; id: number | null }>('/api/operator/whatsapp/consent/optout', {
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

  // DM Queue ⋮ menu: skip (remove from queue) / delete lead / block+denylist handle.
  leadAction: (body: { id?: number; action: 'skip' | 'delete' | 'block'; handle?: string; reason?: string }) =>
    req<{ ok: boolean; removed: number }>('/api/operator/crm/lead-action', {
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

  // ── Email campaign engine ──────────────────────────────────────────────────
  emailCampaigns: () => req<EmailCampaignsResponse>('/api/operator/email-engine/campaigns'),
  emailCampaignGet: (id: string) =>
    req<{ campaign: EmailEngineCampaign }>(`/api/operator/email-engine/campaigns/${id}`),
  emailCampaignCreate: (body: CreateEmailCampaignBody) =>
    req<{ ok: boolean; campaign: EmailEngineCampaign; version: EmailEngineVersion }>(
      '/api/operator/email-engine/campaigns',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    ),
  emailRuns: (campaignId: string) =>
    req<EmailRunsResponse>(`/api/operator/email-engine/campaigns/${campaignId}/runs`),
  emailRunLaunch: (campaignId: string, body: LaunchEmailRunBody) =>
    req<{ run: EmailEngineRun; snapshot: { count: number } }>(
      `/api/operator/email-engine/campaigns/${campaignId}/runs`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    ),
  emailRunGet: (runId: string) =>
    req<EmailRunDetail>(`/api/operator/email-engine/runs/${runId}`),
  emailRunRecipients: (runId: string, opts?: { page?: number; limit?: number; status?: string }) => {
    const sp = new URLSearchParams();
    if (opts?.page) sp.set('page', String(opts.page));
    if (opts?.limit) sp.set('limit', String(opts.limit));
    if (opts?.status) sp.set('status', opts.status);
    const qs = sp.toString();
    return req<EmailRecipientsResponse>(
      `/api/operator/email-engine/runs/${runId}/recipients${qs ? `?${qs}` : ''}`,
    );
  },
  emailRunControl: (runId: string, action: 'pause' | 'resume' | 'stop' | 'continue') =>
    req<{ ok: boolean; status: string }>(`/api/operator/email-engine/runs/${runId}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    }),
  emailRunDrain: (runId: string) =>
    req<EmailDrainResponse>(`/api/operator/email-engine/runs/${runId}/drain`, { method: 'POST' }),
  // Send a campaign draft to ONE test address (no leads/engine touched).
  emailTestSend: (body: { to: string; subject: string; body: string }) =>
    req<{ ok: boolean; to: string; messageId?: string }>('/api/operator/email/test-send', {
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
// Default DM Queue outreach message (Zinga's current cold-DM copy). Shared bulk
// template — the {username} placeholder is filled per-lead by fillTemplate() so
// one message still personalizes for every IG.
export function draftDm(): string {
  return (
    'Hey {username}, love your work on here! 🔥\n' +
    'We’re launching Zinga app to send new clients straight to top beauty and ' +
    'grooming pros. We handle the discovery, upfront payments so you can focus ' +
    'strictly on clients. You keep full control of your rates, scheduling and ' +
    'hours. Think of us like Uber for beauty and grooming pros.\n' +
    'Open to taking on extra bookings this month? download Zinga app in the app store'
  );
}

// Supported mail-merge placeholders for DM templates.
export const DM_TEMPLATE_VARS = ['username', 'name', 'borough', 'category'] as const;

// Fill {username}/{name}/{borough}/{category} in a template for one lead. Unknown
// placeholders are left as-is. Case-insensitive; {handle}=={username}, {business}=={name}.
export function fillTemplate(tpl: string, l: Lead): string {
  const handle = (l.instagram || '').replace(/^@/, '').trim();
  const name = leadName(l);
  const map: Record<string, string> = {
    username: handle || name,
    handle: handle || name,
    name,
    business: name,
    borough: l.borough || '',
    location: l.borough || '',
    category: l.category || '',
  };
  return tpl.replace(/\{(\w+)\}/g, (m, key: string) => {
    const v = map[key.toLowerCase()];
    return v != null && v !== '' ? v : m;
  });
}
