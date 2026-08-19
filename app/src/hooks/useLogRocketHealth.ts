import { useQuery } from '@tanstack/react-query';
import type { LogRocketSummary } from '@/features/logrocket/types';

async function fetchLogRocketSummary(): Promise<LogRocketSummary> {
  const res = await fetch('/api/trackers/logrocket/summary');
  if (!res.ok) throw new Error('Failed to fetch LogRocket summary');
  return res.json();
}

export function useLogRocketHealth() {
  return useQuery<LogRocketSummary>({
    queryKey: ['logrocket-summary'],
    queryFn: fetchLogRocketSummary,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
