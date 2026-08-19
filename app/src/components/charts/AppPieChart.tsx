"use client";

import * as React from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PieChart, Pie, Label } from "recharts";

const months = [
  { month: "January", SP: 186, ZC: 80 },
  { month: "February", SP: 305, ZC: 200 },
  { month: "March", SP: 237, ZC: 120 },
  { month: "April", SP: 73, ZC: 190 },
  { month: "May", SP: 209, ZC: 130 },
  { month: "June", SP: 214, ZC: 140 },
];

const chartConfig = {
  SP: { label: "SP", color: "var(--chart-4)" },
  ZC: { label: "ZC", color: "var(--chart-2)" },
} satisfies ChartConfig;

export default function AppPieChart() {
  const totals = React.useMemo(() => {
    const SP = months.reduce((a, m) => a + m.SP, 0);
    const ZC = months.reduce((a, m) => a + m.ZC, 0);
    return { SP, ZC, total: SP + ZC };
  }, []);

  const data = [
    { name: "SP", value: totals.SP, fill: "var(--color-SP)" },
    { name: "ZC", value: totals.ZC, fill: "var(--color-ZC)" },
  ];

  return (
    <div>
      <h1 className="text-xl mb-6 font-medium">Total Revenue</h1>
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square max-h-[250px] w-full"
      >
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            strokeWidth={5}
          >
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-3xl font-bold"
                      >
                        {totals.total.toLocaleString()}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 24}
                        className="fill-muted-foreground"
                      >
                        Total
                      </tspan>
                    </text>
                  );
                }
                return null;
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
    </div>
  );
}
