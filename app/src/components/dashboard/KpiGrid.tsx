'use client';

import StatCard from '@/components/common/StatCard';
import { ComponentType } from 'react';

export type KpiConfig = {
  key: string;
  title: string;
  value: string;
  changeValue?: number;
  changeText?: string;
  Icon?: ComponentType<React.SVGProps<SVGSVGElement>>;
};

export function KpiGrid({ items, loading = false }: { items: KpiConfig[]; loading?: boolean }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      {items.map((kpi) => (
        <StatCard
          key={kpi.key}
          title={kpi.title}
          value={kpi.value}
          changeValue={kpi.changeValue}
          changeText={kpi.changeText}
          Icon={kpi.Icon}
          loading={loading}
        />
      ))}
    </div>
  );
}
