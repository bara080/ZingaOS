'use client';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

export type BarChartPoint = {
  label: string;
  value: number;
};

type AppBarChartProps = {
  data: BarChartPoint[];
  loading?: boolean;
};

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

export default function AppBarChart({ data, loading }: AppBarChartProps) {
  if (loading) {
    return <div className="h-[200px] animate-pulse rounded-md bg-muted" />;
  }

  if (!data.length) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
        No revenue data
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} tickMargin={10} axisLine={false} />
        <YAxis tickLine={false} tickMargin={10} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="value" fill="var(--color-revenue)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
