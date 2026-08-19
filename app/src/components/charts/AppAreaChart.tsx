"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

const chartConfig = {
  SP: { label: "SP", color: "var(--chart-4)" },
  ZC: { label: "ZC", color: "var(--chart-2)" },
} satisfies ChartConfig;

const chartData = [
  { month: "January", SP: 186, ZC: 80 },
  { month: "February", SP: 305, ZC: 200 },
  { month: "March", SP: 237, ZC: 120 },
  { month: "April", SP: 73, ZC: 190 },
  { month: "May", SP: 209, ZC: 130 },
  { month: "June", SP: 214, ZC: 140 },
];

export default function AppAreaChart() {
  return (
    <div>
      <h1 className="text-xl mb-6 font-medium">Total Revenue</h1>
      <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <AreaChart data={chartData} margin={{ left: -20, right: 12 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(v) => String(v).slice(0, 3)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickCount={3}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Area
            dataKey="SP"
            type="natural"
            fill="var(--color-SP)"
            fillOpacity={0.4}
            stroke="var(--color-SP)"
            stackId="a"
          />
          <Area
            dataKey="ZC"
            type="natural"
            fill="var(--color-ZC)"
            fillOpacity={0.4}
            stroke="var(--color-ZC)"
            stackId="a"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
