import { useQuery } from '@tanstack/react-query';
import type { SentrySummary } from '@/features/sentry/types';

async function fetchSentrySummary(): Promise<SentrySummary> {
  const res = await fetch('/api/trackers/sentry/summary');
  if (!res.ok) throw new Error('Failed to fetch Sentry summary');
  return res.json();
}

export function useSentryHealth() {
  return useQuery<SentrySummary>({
    queryKey: ['sentry-summary'],
    queryFn: fetchSentrySummary,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
