'use client';

// TanStack Query hooks for the CRM. Thin wrappers over crmApi — same pattern as
// the operator hooks.
import { useQuery } from '@tanstack/react-query';
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
