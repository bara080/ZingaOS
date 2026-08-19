'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

const chartConfig = {
  count: { label: 'Events', color: 'var(--chart-1)' },
} satisfies ChartConfig;

type VexoSummary = {
  totalEvents: number;
  uniqueUsers: number;
  uniqueSessions: number;
  activeRoutes: number;
  trend: { date: string; count: number }[];
  topRoutes: { route: string; count: number }[];
  topDevices: { model: string; count: number }[];
};

type VexoEventsResponse = {
  data: {
    id: string;
    route: string;
    type: string;
    timestamp: string;
    device: { model: string; os: string };
    location: string;
    appVersion: string;
    customerUid: string;
    sessionId: string;
  }[];
  total: number;
  page: number;
  pageSize: number;
};

async function fetchSummary(): Promise<VexoSummary> {
  const res = await fetch('/api/trackers/vexo/summary');
  if (!res.ok) throw new Error('Failed to fetch Vexo summary');
  return res.json();
}

async function fetchEvents(params: { page: number }): Promise<VexoEventsResponse> {
  const query = new URLSearchParams({ page: String(params.page) });
  const res = await fetch(`/api/trackers/vexo/events?${query}`);
  if (!res.ok) throw new Error('Failed to fetch Vexo events');
  return res.json();
}

export default function VexoPage() {
  const [page, setPage] = useState(1);

  const summary = useQuery<VexoSummary>({
    queryKey: ['vexo-summary'],
    queryFn: fetchSummary,
    staleTime: 5 * 60 * 1000,
  });

  const events = useQuery<VexoEventsResponse>({
    queryKey: ['vexo-events', page],
    queryFn: () => fetchEvents({ page }),
    staleTime: 2 * 60 * 1000,
  });

  const totalPages = events.data
    ? Math.ceil(events.data.total / (events.data.pageSize ?? 20))
    : 1;

  const statCards = [
    {
      label: '7-Day Events',
      display: (summary.data?.totalEvents ?? 0).toLocaleString(),
      color: 'text-foreground',
    },
    {
      label: 'Unique Users',
      display: (summary.data?.uniqueUsers ?? 0).toLocaleString(),
      color: 'text-foreground',
    },
    {
      label: 'Unique Sessions',
      display: (summary.data?.uniqueSessions ?? 0).toLocaleString(),
      color: 'text-foreground',
    },
    {
      label: 'Active Screens',
      display: (summary.data?.activeRoutes ?? 0).toLocaleString(),
      color: 'text-foreground',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Vexo — User Events</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="bg-primary-foreground">
            <CardContent className="pt-4">
              {summary.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-16" />
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.display}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="bg-primary-foreground">
          <CardHeader>
            <CardTitle className="text-sm">Event Trend (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.isLoading ? (
              <div className="h-[180px] animate-pulse rounded-md bg-muted" />
            ) : (summary.data?.trend.length ?? 0) === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                No events recorded yet
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[180px] w-full">
                <BarChart data={summary.data!.trend}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-primary-foreground">
          <CardHeader>
            <CardTitle className="text-sm">Top Screens by Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))
            ) : (summary.data?.topRoutes.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No events recorded yet
              </p>
            ) : (
              (() => {
                const max = Math.max(...summary.data!.topRoutes.map((r) => r.count), 1);
                return summary.data!.topRoutes.map((r) => (
                  <div key={r.route} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground truncate max-w-[75%]">{r.route}</span>
                      <span className="text-muted-foreground">{r.count.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${(r.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                ));
              })()
            )}
          </CardContent>
        </Card>
      </div>

      {/* Events table */}
      <Card className="bg-primary-foreground">
        <CardHeader>
          <CardTitle className="text-sm">All Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th scope="col" className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Screen</th>
                  <th scope="col" className="text-left px-4 py-2 text-xs text-muted-foreground font-medium hidden md:table-cell">Device</th>
                  <th scope="col" className="text-left px-4 py-2 text-xs text-muted-foreground font-medium hidden lg:table-cell">Location</th>
                  <th scope="col" className="text-left px-4 py-2 text-xs text-muted-foreground font-medium hidden lg:table-cell">Version</th>
                  <th scope="col" className="text-right px-4 py-2 text-xs text-muted-foreground font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {events.isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={5} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))}
                {!events.isLoading && (events.data?.data.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No events found
                    </td>
                  </tr>
                )}
                {events.data?.data.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground text-xs leading-snug">{event.route}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{event.type}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-foreground">{event.device.model}</p>
                      <p className="text-xs text-muted-foreground">{event.device.os}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-xs text-muted-foreground">{event.location}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-xs text-muted-foreground">v{event.appVersion}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {events.data?.total ?? 0} events
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="text-xs px-2 py-1 rounded border border-border disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="text-xs px-2 py-1 rounded border border-border disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
