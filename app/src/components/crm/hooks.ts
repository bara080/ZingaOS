'use client';

// TanStack Query hooks for the CRM. Thin wrappers over crmApi — same pattern as
// the operator hooks.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crmApi } from './api';

export const crmKeys = {
  leads: (params?: { stage?: string; source?: string; q?: string }) =>
    ['crm', 'leads', params?.stage ?? '', params?.source ?? '', params?.q ?? ''] as const,
  stats: ['crm', 'stats'] as const,
  igThreads: ['crm', 'ig', 'threads'] as const,
  igThread: (igsid: string | null) => ['crm', 'ig', 'thread', igsid] as const,
  campaigns: ['crm', 'campaigns'] as const,
  segments: ['crm', 'segments'] as const,
  analytics: (days: number) => ['crm', 'analytics', days] as const,
  agents: ['crm', 'agents'] as const,
  automations: ['crm', 'automations'] as const,
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
