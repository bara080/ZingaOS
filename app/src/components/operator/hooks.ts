'use client';

// TanStack Query hooks over the existing /api/operator/* routes. Every hook here
// is a thin wrapper around `operatorApi` (see ./api.ts) — caching, auto-refetch,
// and loading/error states come from React Query. Nothing here modifies the API
// routes; it only reads/writes through them.
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { operatorApi, type ScrapeSource } from './api';

export const operatorKeys = {
  analytics: ['operator', 'analytics'] as const,
  sources: ['operator', 'sources'] as const,
  campaign: (src: string) => ['operator', 'campaign', src] as const,
  logs: ['operator', 'logs'] as const,
  igConversations: ['operator', 'ig', 'conversations'] as const,
  scrapeStatus: (runId: string | null) => ['operator', 'scrape', 'status', runId] as const,
  scrapeResults: (dataset: string | null) => ['operator', 'scrape', 'results', dataset] as const,
};

// ── Analytics tab ─────────────────────────────────────────────────────────
export function useAnalytics(enabled = true) {
  return useQuery({
    queryKey: operatorKeys.analytics,
    queryFn: operatorApi.analytics,
    enabled,
    refetchInterval: 15_000,
  });
}

// ── Email tab ─────────────────────────────────────────────────────────────
export function useSources(enabled = true) {
  return useQuery({
    queryKey: operatorKeys.sources,
    queryFn: operatorApi.sources,
    enabled,
    refetchInterval: 20_000,
  });
}

export function useCampaign(src: string, enabled = true) {
  return useQuery({
    queryKey: operatorKeys.campaign(src),
    queryFn: () => operatorApi.campaign(src),
    enabled,
    refetchInterval: 12_000,
  });
}

export function useLogs(enabled = true) {
  return useQuery({
    queryKey: operatorKeys.logs,
    queryFn: operatorApi.logs,
    enabled,
    refetchInterval: 12_000,
  });
}

export function useSendBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { src: string; limit: number }) => operatorApi.sendBatch(vars),
    onSuccess: () => {
      // A send changes campaign counts, sources, analytics and the audit trail.
      qc.invalidateQueries({ queryKey: ['operator'] });
    },
  });
}

// ── Scrape tab ────────────────────────────────────────────────────────────
export function useScrapeStart() {
  return useMutation({
    mutationFn: (vars: { source: ScrapeSource; query: string; number: number }) =>
      operatorApi.scrapeStart(vars),
  });
}

// Polls Apify run status while a runId is set; the caller stops polling by
// clearing the runId once the run reaches a terminal state.
export function useScrapeStatus(runId: string | null, enabled: boolean) {
  const options: UseQueryOptions<Awaited<ReturnType<typeof operatorApi.scrapeStatus>>> = {
    queryKey: operatorKeys.scrapeStatus(runId),
    queryFn: () => operatorApi.scrapeStatus(runId as string),
    enabled: enabled && !!runId,
    refetchInterval: enabled && runId ? 4_000 : false,
  };
  return useQuery(options);
}

export function useScrapeResults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { dataset: string; source: ScrapeSource }) =>
      operatorApi.scrapeResults(vars.dataset, vars.source),
    onSuccess: () => {
      // New leads land in the DB → sources + campaign + analytics are stale.
      qc.invalidateQueries({ queryKey: operatorKeys.sources });
      qc.invalidateQueries({ queryKey: operatorKeys.analytics });
    },
  });
}

// ── Social → Instagram ────────────────────────────────────────────────────
export function useIgConversations(enabled: boolean) {
  return useQuery({
    queryKey: operatorKeys.igConversations,
    queryFn: operatorApi.igConversations,
    enabled,
    retry: false,
    refetchInterval: enabled ? 20_000 : false,
  });
}

export function useIgSend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { igsid: string; text: string }) => operatorApi.igSend(vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: operatorKeys.logs }),
  });
}
