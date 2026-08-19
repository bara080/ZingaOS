import { useMemo } from 'react';
import { useRevenue } from './useRevenue';

export function useOverviewRevenue() {
  const { data, isLoading } = useRevenue();

  const totals = useMemo(() => {
    if (!data || data.length === 0) {
      return { current: 0, previous: 0 };
    }

    const sorted = [...data].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));

    return {
      current: sorted.at(-1)?.revenue ?? 0,
      previous: sorted.at(-2)?.revenue ?? 0,
    };
  }, [data]);

  const chartData = useMemo(
    () =>
      data?.map((r) => ({
        label: `${r.month}/${r.year}`,
        value: r.revenue,
      })) ?? [],
    [data],
  );

  return {
    isLoading,
    totals,
    chartData,
  };
}
