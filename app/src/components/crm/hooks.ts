'use client';

// TanStack Query hooks for the CRM. Thin wrappers over crmApi — same pattern as
// the operator hooks.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crmApi } from './api';

export const crmKeys = {
  leads: (params?: { stage?: string; source?: string; q?: string }) =>
    ['crm', 'leads', params?.stage ?? '', params?.source ?? '', params?.q ?? ''] as const,
};

export function useLeads(params?: { stage?: string; source?: string; q?: string }) {
  return useQuery({
    queryKey: crmKeys.leads(params),
    queryFn: () => crmApi.leads(params),
    refetchInterval: 30_000,
  });
}

// Persist a "Mark as Sent": logs the send + advances stage to contacted server-side.
// On success, invalidate every CRM leads query so stage/counts reflect the change.
export function useMarkSent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { leadId: number; platform?: string; sendMode?: string; message?: string }) =>
      crmApi.markSent(vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm', 'leads'] }),
  });
}
