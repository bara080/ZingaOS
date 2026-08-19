import { useQuery } from '@tanstack/react-query';

export type RevenuePoint = {
  year: number;
  month: number;
  revenue: number;
};

export function useRevenue() {
  return useQuery<RevenuePoint[]>({
    queryKey: ['dashboard-revenue'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/revenue');
      if (!res.ok) {
        throw new Error('Failed to fetch revenue');
      }
      const json = await res.json();
      return json.data;
    },
    staleTime: 60_000, // 1 minute
  });
}
