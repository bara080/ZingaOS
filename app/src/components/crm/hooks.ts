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
