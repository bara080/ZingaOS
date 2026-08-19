'use client';

import { useMemo } from 'react';
import { KpiGrid } from './KpiGrid';
import { buildOverviewKpis } from './buildOverviewKpis';
import type { OverviewSample } from './types';

type Props = {
  overviewData: OverviewSample;
  revenue: number;
  revenuePrev: number;
  loading?: boolean;
};

export function OverviewKpisSection({ overviewData, revenue, revenuePrev, loading }: Props) {
  const kpis = useMemo(
    () =>
      buildOverviewKpis({
        ...overviewData,
        revenue,
        revenuePrev,
      }),
    [overviewData, revenue, revenuePrev],
  );

  return <KpiGrid items={kpis} loading={loading} />;
}
