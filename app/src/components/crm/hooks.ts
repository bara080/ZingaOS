'use client';

// TanStack Query hooks for the CRM. Thin wrappers over crmApi — same pattern as
// the operator hooks.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crmApi } from './api';
import type { Lead, LeadsResponse } from './api';

export const crmKeys = {
  leads: (params?: { stage?: string; source?: string; q?: string }) =>
    ['crm', 'leads', params?.stage ?? '', params?.source ?? '', params?.q ?? ''] as const,
  stats: ['crm', 'stats'] as const,
  igThreads: ['crm', 'ig', 'threads'] as const,
  igThread: (igsid: string | null) => ['crm', 'ig', 'thread', igsid] as const,
  emailThreads: ['crm', 'email', 'threads'] as const,
  emailThread: (contact: string | null) => ['crm', 'email', 'thread', contact] as const,
  smsThreads: ['crm', 'sms', 'threads'] as const,
  smsThread: (phone: string | null) => ['crm', 'sms', 'thread', phone] as const,
  smsConsent: ['crm', 'sms', 'consent'] as const,
  whatsappThreads: ['crm', 'whatsapp', 'threads'] as const,
  whatsappThread: (phone: string | null) => ['crm', 'whatsapp', 'thread', phone] as const,
  whatsappConsent: ['crm', 'whatsapp', 'consent'] as const,
  campaigns: ['crm', 'campaigns'] as const,
  segments: ['crm', 'segments'] as const,
  analytics: (days: number) => ['crm', 'analytics', days] as const,
  agents: ['crm', 'agents'] as const,
  automations: ['crm', 'automations'] as const,
  emailCampaigns: ['crm', 'email-engine', 'campaigns'] as const,
  emailRuns: (campaignId: string | null) => ['crm', 'email-engine', 'runs', campaignId] as const,
  emailRun: (runId: string | null) => ['crm', 'email-engine', 'run', runId] as const,
  emailRunRecipients: (runId: string | null, page: number, status?: string) =>
    ['crm', 'email-engine', 'run', runId, 'recipients', page, status ?? ''] as const,
};

export function useLeads(params?: { stage?: string; source?: string; q?: string }) {
  return useQuery({
    queryKey: crmKeys.leads(params),
    queryFn: () => crmApi.leads(params),
    refetchInterval: 30_000,
  });
}

export function useCrmStats() {
  return useQuery({
    queryKey: crmKeys.stats,
    queryFn: () => crmApi.stats(),
    refetchInterval: 20_000,
  });
}

export function useIgThreads(enabled = true) {
  return useQuery({
    queryKey: crmKeys.igThreads,
    queryFn: () => crmApi.igThreads(),
    enabled,
    retry: false,
    refetchInterval: enabled ? 20_000 : false,
  });
}

export function useIgThread(igsid: string | null, enabled = true) {
  return useQuery({
    queryKey: crmKeys.igThread(igsid),
    queryFn: () => crmApi.igThread(igsid as string),
    enabled: enabled && !!igsid,
    retry: false,
    refetchInterval: enabled && igsid ? 15_000 : false,
  });
}

export function useIgDraft() {
  return useMutation({ mutationFn: (vars: { igsid: string }) => crmApi.igDraft(vars.igsid) });
}

export function useIgSend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { igsid: string; text: string }) => crmApi.igSend(vars),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: crmKeys.igThreads });
      qc.invalidateQueries({ queryKey: crmKeys.igThread(vars.igsid) });
    },
  });
}

// ── Email channel ─────────────────────────────────────────────────────────
export function useEmailThreads(enabled = true) {
  return useQuery({
    queryKey: crmKeys.emailThreads,
    queryFn: () => crmApi.emailThreads(),
    enabled,
    retry: false,
    refetchInterval: enabled ? 20_000 : false,
  });
}

export function useEmailThread(contact: string | null, enabled = true) {
  return useQuery({
    queryKey: crmKeys.emailThread(contact),
    queryFn: () => crmApi.emailThread(contact as string),
    enabled: enabled && !!contact,
    retry: false,
    refetchInterval: enabled && contact ? 15_000 : false,
  });
}

export function useEmailDraft() {
  return useMutation({ mutationFn: (vars: { contact: string }) => crmApi.emailDraft(vars.contact) });
}

export function useEmailSend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { contact: string; subject: string; body: string; inReplyTo?: string }) =>
      crmApi.emailSend(vars),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: crmKeys.emailThreads });
      qc.invalidateQueries({ queryKey: crmKeys.emailThread(vars.contact) });
    },
  });
}

export function useEmailPoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => crmApi.emailPoll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.emailThreads });
    },
  });
}

// ── SMS channel (consent-gated) ─────────────────────────────────────────────
export function useSmsThreads(enabled = true) {
  return useQuery({
    queryKey: crmKeys.smsThreads,
    queryFn: () => crmApi.smsThreads(),
    enabled,
    retry: false,
    refetchInterval: enabled ? 20_000 : false,
  });
}

export function useSmsThread(phone: string | null, enabled = true) {
  return useQuery({
    queryKey: crmKeys.smsThread(phone),
    queryFn: () => crmApi.smsThread(phone as string),
    enabled: enabled && !!phone,
    retry: false,
    refetchInterval: enabled && phone ? 15_000 : false,
  });
}

export function useSmsConsent(enabled = true) {
  return useQuery({
    queryKey: crmKeys.smsConsent,
    queryFn: () => crmApi.smsConsentList(),
    enabled,
    retry: false,
    refetchInterval: enabled ? 30_000 : false,
  });
}

export function useSmsDraft() {
  return useMutation({
    mutationFn: (vars: {
      name?: string;
      business?: string;
      category?: string;
      borough?: string;
      base?: string;
      instruction?: string;
    }) => crmApi.smsDraft(vars),
  });
}

export function useSmsSend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { to: string; text: string }) => crmApi.smsSend(vars),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: crmKeys.smsThreads });
      qc.invalidateQueries({ queryKey: crmKeys.smsThread(vars.to) });
    },
  });
}

export function useSmsConsentAdd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { phone: string; name?: string; leadId?: number; source?: string }) =>
      crmApi.smsConsentAdd(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.smsConsent });
      qc.invalidateQueries({ queryKey: crmKeys.smsThreads });
    },
  });
}

export function useSmsConsentOptout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { phone: string }) => crmApi.smsConsentOptout(body),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: crmKeys.smsConsent });
      qc.invalidateQueries({ queryKey: crmKeys.smsThreads });
      qc.invalidateQueries({ queryKey: crmKeys.smsThread(vars.phone) });
    },
  });
}

// ── WhatsApp channel (consent-gated · Meta Cloud API) ────────────────────────
export function useWhatsappThreads(enabled = true) {
  return useQuery({
    queryKey: crmKeys.whatsappThreads,
    queryFn: () => crmApi.whatsappThreads(),
    enabled,
    retry: false,
    refetchInterval: enabled ? 20_000 : false,
  });
}

export function useWhatsappThread(phone: string | null, enabled = true) {
  return useQuery({
    queryKey: crmKeys.whatsappThread(phone),
    queryFn: () => crmApi.whatsappThread(phone as string),
    enabled: enabled && !!phone,
    retry: false,
    refetchInterval: enabled && phone ? 15_000 : false,
  });
}

export function useWhatsappConsent(enabled = true) {
  return useQuery({
    queryKey: crmKeys.whatsappConsent,
    queryFn: () => crmApi.whatsappConsentList(),
    enabled,
    retry: false,
    refetchInterval: enabled ? 30_000 : false,
  });
}

export function useWhatsappDraft() {
  return useMutation({
    mutationFn: (vars: {
      name?: string;
      business?: string;
      category?: string;
      borough?: string;
      base?: string;
      instruction?: string;
    }) => crmApi.whatsappDraft(vars),
  });
}

export function useWhatsappSend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { to: string; text: string }) => crmApi.whatsappSend(vars),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: crmKeys.whatsappThreads });
      qc.invalidateQueries({ queryKey: crmKeys.whatsappThread(vars.to) });
    },
  });
}

export function useWhatsappConsentAdd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { phone: string; name?: string; leadId?: number; source?: string }) =>
      crmApi.whatsappConsentAdd(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.whatsappConsent });
      qc.invalidateQueries({ queryKey: crmKeys.whatsappThreads });
    },
  });
}

export function useWhatsappConsentOptout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { phone: string }) => crmApi.whatsappConsentOptout(body),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: crmKeys.whatsappConsent });
      qc.invalidateQueries({ queryKey: crmKeys.whatsappThreads });
      qc.invalidateQueries({ queryKey: crmKeys.whatsappThread(vars.phone) });
    },
  });
}

// ── Campaigns ───────────────────────────────────────────────────────────────
export function useCampaigns() {
  return useQuery({
    queryKey: crmKeys.campaigns,
    queryFn: () => crmApi.campaigns(),
    refetchInterval: 30_000,
  });
}

export function useSegments() {
  return useQuery({ queryKey: crmKeys.segments, queryFn: () => crmApi.segments() });
}

export function useCampaignCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof crmApi.campaignCreate>[0]) => crmApi.campaignCreate(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.campaigns }),
  });
}

export function useCampaignSetStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; status: 'active' | 'paused' }) => crmApi.campaignSetStatus(vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.campaigns }),
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────
export function useAnalytics(days = 14) {
  return useQuery({
    queryKey: crmKeys.analytics(days),
    queryFn: () => crmApi.analytics(days),
    refetchInterval: 60_000,
  });
}

// ── Per-lead activity (DM Queue · Activity tab) ─────────────────────────────
export function useLeadActivity(leadId: number | null, enabled = true) {
  return useQuery({
    queryKey: ['crm', 'lead-activity', leadId] as const,
    queryFn: () => crmApi.leadActivity(leadId as number),
    enabled: enabled && !!leadId,
    refetchInterval: false,
  });
}

// ── AI Agents ───────────────────────────────────────────────────────────────
export function useAgents() {
  return useQuery({
    queryKey: crmKeys.agents,
    queryFn: () => crmApi.agents(),
    refetchInterval: 30_000,
  });
}

export function useAgentCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof crmApi.agentCreate>[0]) => crmApi.agentCreate(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.agents }),
  });
}

export function useAgentSetEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; enabled: boolean }) => crmApi.agentSetEnabled(vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.agents }),
  });
}

// ── Automations ───────────────────────────────────────────────────────────────
export function useAutomations() {
  return useQuery({
    queryKey: crmKeys.automations,
    queryFn: () => crmApi.automations(),
    refetchInterval: 30_000,
  });
}

export function useAutomationCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof crmApi.automationCreate>[0]) => crmApi.automationCreate(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.automations }),
  });
}

export function useAutomationSetEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; enabled: boolean }) => crmApi.automationSetEnabled(vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.automations }),
  });
}

// AI intro-DM draft (gpt-4o) for the DM Queue.
// DM Queue ⋮ menu — skip/delete/block a lead. OPTIMISTIC: the lead is removed from
// every cached leads list in onMutate so the UI re-renders instantly; rolled back
// on error; re-synced from the server on settle.
type LeadActionVars = { id?: number; action: 'skip' | 'delete' | 'block'; handle?: string; reason?: string };
export function useLeadAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LeadActionVars) => crmApi.leadAction(body),
    onMutate: async (body: LeadActionVars) => {
      await qc.cancelQueries({ queryKey: ['crm', 'leads'] });
      const prev = qc.getQueriesData<LeadsResponse>({ queryKey: ['crm', 'leads'] });
      // Drop the lead from every cached leads list immediately.
      qc.setQueriesData<LeadsResponse>({ queryKey: ['crm', 'leads'] }, (old) =>
        old ? { ...old, leads: old.leads.filter((l: Lead) => l.id !== body.id) } : old,
      );
      return { prev };
    },
    onError: (_e, _body, ctx) => {
      // Roll back every list we touched.
      ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['crm', 'leads'] });
      qc.invalidateQueries({ queryKey: ['crm', 'stats'] });
    },
  });
}

export function useDmDraft() {
  return useMutation({
    mutationFn: (vars: {
      name?: string;
      business?: string;
      category?: string;
      borough?: string;
      instruction?: string;
      base?: string;
    }) => crmApi.dmDraft(vars),
  });
}

// Add a lead from the Leads screen; invalidate the leads lists on success.
export function useLeadAdd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof crmApi.leadAdd>[0]) => crmApi.leadAdd(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm', 'leads'] });
      qc.invalidateQueries({ queryKey: crmKeys.stats });
    },
  });
}

// ── Email campaign engine ───────────────────────────────────────────────────
export function useEmailCampaigns() {
  return useQuery({
    queryKey: crmKeys.emailCampaigns,
    queryFn: () => crmApi.emailCampaigns(),
    refetchInterval: 30_000,
  });
}

export function useEmailCampaignCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof crmApi.emailCampaignCreate>[0]) => crmApi.emailCampaignCreate(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.emailCampaigns }),
  });
}

export function useEmailRuns(campaignId: string | null, enabled = true) {
  return useQuery({
    queryKey: crmKeys.emailRuns(campaignId),
    queryFn: () => crmApi.emailRuns(campaignId as string),
    enabled: enabled && !!campaignId,
    refetchInterval: enabled && campaignId ? 15_000 : false,
  });
}

export function useEmailRunLaunch(campaignId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof crmApi.emailRunLaunch>[1]) =>
      crmApi.emailRunLaunch(campaignId as string, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.emailRuns(campaignId) });
      qc.invalidateQueries({ queryKey: crmKeys.emailCampaigns });
    },
  });
}

export function useEmailRun(runId: string | null, enabled = true) {
  return useQuery({
    queryKey: crmKeys.emailRun(runId),
    queryFn: () => crmApi.emailRunGet(runId as string),
    enabled: enabled && !!runId,
    refetchInterval: enabled && runId ? 5_000 : false,
  });
}

export function useEmailRunRecipients(
  runId: string | null,
  opts?: { page?: number; status?: string; enabled?: boolean },
) {
  const page = opts?.page ?? 1;
  const enabled = opts?.enabled ?? true;
  return useQuery({
    queryKey: crmKeys.emailRunRecipients(runId, page, opts?.status),
    queryFn: () => crmApi.emailRunRecipients(runId as string, { page, status: opts?.status }),
    enabled: enabled && !!runId,
  });
}

export function useEmailRunControl(runId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: 'pause' | 'resume' | 'stop' | 'continue') =>
      crmApi.emailRunControl(runId as string, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.emailRun(runId) }),
  });
}

export function useEmailRunDrain(runId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => crmApi.emailRunDrain(runId as string),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.emailRun(runId) }),
  });
}

// Send a campaign draft to a single test address (no leads/engine touched).
export function useEmailTestSend() {
  return useMutation({
    mutationFn: (body: { to: string; subject: string; body: string }) => crmApi.emailTestSend(body),
  });
}

// Persist a "Mark as Sent": logs the send + advances stage to contacted server-side.
// On success, invalidate every CRM leads query so stage/counts reflect the change.
export function useMarkSent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { leadId: number; platform?: string; sendMode?: string; message?: string }) =>
      crmApi.markSent(vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm', 'leads'] });
      qc.invalidateQueries({ queryKey: crmKeys.stats }); // refresh sent_today / dashboard
    },
  });
}
