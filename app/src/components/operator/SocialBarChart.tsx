'use client';

// Animated recharts histogram of leads per platform — the Analytics showcase.
// Bars animate up on mount with a teal→green vertical gradient, value labels on
// top, and platform labels below. Platforms with 0 leads still render (as a
// faint baseline) so the axis is always complete.
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { C } from './theme';

export type PlatformPoint = { platform: string; leads: number };

export function SocialBarChart({ data }: { data: PlatformPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.leads));
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 28, right: 16, left: 4, bottom: 8 }}>
          <defs>
            <linearGradient id="operatorBarFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.teal} stopOpacity={0.95} />
              <stop offset="100%" stopColor={C.green} stopOpacity={0.85} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="platform"
            tickLine={false}
            axisLine={{ stroke: C.line }}
            tick={{ fill: C.ink2, fontSize: 12, fontFamily: C.mono }}
            tickMargin={10}
          />
          <YAxis
            allowDecimals={false}
            width={34}
            tickLine={false}
            axisLine={false}
            tick={{ fill: C.ink3, fontSize: 11, fontFamily: C.mono }}
            domain={[0, Math.ceil(max * 1.15)]}
          />
          <Tooltip
            cursor={{ fill: 'rgba(47,217,201,0.06)' }}
            contentStyle={{
              background: C.panel2,
              border: `1px solid ${C.line}`,
              borderRadius: 9,
              fontFamily: C.mono,
              fontSize: 12,
              color: C.ink,
            }}
            labelStyle={{ color: C.ink2 }}
            formatter={(v: number) => [`${v} leads`, '']}
          />
          <Bar
            dataKey="leads"
            radius={[7, 7, 0, 0]}
            fill="url(#operatorBarFill)"
            isAnimationActive
            animationDuration={900}
            animationEasing="ease-out"
            maxBarSize={90}
          >
            {data.map((d) => (
              <Cell
                key={d.platform}
                fill={d.leads === 0 ? C.panel2 : 'url(#operatorBarFill)'}
                stroke={d.leads === 0 ? C.line : 'none'}
              />
            ))}
            <LabelList
              dataKey="leads"
              position="top"
              style={{ fill: C.ink, fontFamily: C.mono, fontSize: 12, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
