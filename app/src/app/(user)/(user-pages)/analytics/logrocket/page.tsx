'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ExternalLink } from 'lucide-react';
import type { LogRocketSummary, LogRocketSessionsResponse } from '@/features/logrocket/types';

const chartConfig = {
  sessions: { label: 'Sessions', color: 'var(--chart-1)' },
  errorSessions: { label: 'Error Sessions', color: 'var(--chart-2)' },
} satisfies ChartConfig;

async function fetchSummary(): Promise<LogRocketSummary> {
  const res = await fetch('/api/trackers/logrocket/summary');
  if (!res.ok) throw new Error('Failed to fetch LogRocket summary');
  return res.json();
}

async function fetchSessions(params: {
  page: number;
  hasErrors: string;
}): Promise<LogRocketSessionsResponse> {
  const query = new URLSearchParams({ page: String(params.page) });
  if (params.hasErrors !== 'all') query.set('hasErrors', params.hasErrors);
  const res = await fetch(`/api/trackers/logrocket/sessions?${query}`);
  if (!res.ok) throw new Error('Failed to fetch LogRocket sessions');
  return res.json();
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function LogRocketPage() {
  const [errorFilter, setErrorFilter] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);

  const summary = useQuery<LogRocketSummary>({
    queryKey: ['logrocket-summary'],
    queryFn: fetchSummary,
    staleTime: 5 * 60 * 1000,
  });

  const sessions = useQuery<LogRocketSessionsResponse>({
    queryKey: ['logrocket-sessions', page, errorFilter],
    queryFn: () => fetchSessions({ page, hasErrors: errorFilter }),
    staleTime: 2 * 60 * 1000,
  });

  const totalPages = sessions.data
    ? Math.ceil(sessions.data.total / (sessions.data.pageSize ?? 20))
    : 1;

  const statCards = [
    {
      label: 'Total Sessions',
      display: String(summary.data?.totalSessions ?? 0),
      color: 'text-foreground',
    },
    {
      label: 'Error-Free Rate',
      display:
        summary.data?.errorFreeRate != null ? `${summary.data.errorFreeRate}%` : '—',
      color:
        summary.data?.errorFreeRate == null
          ? 'text-muted-foreground'
          : summary.data.errorFreeRate >= 99
            ? 'text-emerald-500'
            : summary.data.errorFreeRate >= 95
              ? 'text-amber-500'
              : 'text-red-500',
    },
    {
      label: 'Error Sessions',
      display: String(summary.data?.errorSessions ?? 0),
      color: (summary.data?.errorSessions ?? 0) > 0 ? 'text-red-500' : 'text-emerald-500',
    },
    {
      label: 'Avg Duration',
      display:
        summary.data?.avgDuration != null
          ? formatDuration(summary.data.avgDuration)
          : '—',
      color: 'text-foreground',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">LogRocket — Session Replays</h1>

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
            <CardTitle className="text-sm">Session Trend (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.isLoading ? (
              <div className="h-[180px] animate-pulse rounded-md bg-muted" />
            ) : (summary.data?.trend.length ?? 0) === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                No trend data yet — waiting for first cron sync
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[180px] w-full">
                <BarChart data={summary.data!.trend}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="sessions" fill="var(--color-sessions)" radius={4} />
                  <Bar dataKey="errorSessions" fill="var(--color-errorSessions)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-primary-foreground">
          <CardHeader>
            <CardTitle className="text-sm">Top Errors by Frequency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))
            ) : (summary.data?.topErrors.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No errors recorded yet
              </p>
            ) : (
              (() => {
                const max = Math.max(...summary.data!.topErrors.map((e) => e.count), 1);
                return summary.data!.topErrors.map((err, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground truncate max-w-[75%]">{err.message}</span>
                      <span className="text-muted-foreground">{err.count.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-500"
                        style={{ width: `${(err.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                ));
              })()
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sessions table */}
      <Card className="bg-primary-foreground">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">All Sessions</CardTitle>
          <Select
            value={errorFilter}
            onValueChange={(v) => {
              setErrorFilter(v as 'all' | 'true' | 'false');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Filter sessions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sessions</SelectItem>
              <SelectItem value="true">With errors</SelectItem>
              <SelectItem value="false">Error-free</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th aria-hidden="true" className="text-left px-4 py-2 text-xs text-muted-foreground font-medium w-6" />
                  <th scope="col" className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">
                    User / Page
                  </th>
                  <th scope="col" className="text-left px-4 py-2 text-xs text-muted-foreground font-medium hidden md:table-cell">
                    Browser / OS
                  </th>
                  <th scope="col" className="text-right px-4 py-2 text-xs text-muted-foreground font-medium hidden lg:table-cell">
                    Duration
                  </th>
                  <th scope="col" className="text-left px-4 py-2 text-xs text-muted-foreground font-medium hidden lg:table-cell">
                    Errors
                  </th>
                  <th scope="col" className="text-right px-4 py-2 text-xs text-muted-foreground font-medium">
                    Last seen
                  </th>
                  <th aria-hidden="true" className="px-4 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {sessions.isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={7} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))}
                {!sessions.isLoading && (sessions.data?.data.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No sessions found
                    </td>
                  </tr>
                )}
                {sessions.data?.data.map((session) => (
                  <tr
                    key={session.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className={`text-xs ${session.hasErrors ? 'text-red-500' : 'text-emerald-500'}`}>
                        ●
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground leading-snug">
                        {session.identity?.email || session.identity?.name || 'Anonymous'}
                      </p>
                      {session.pageUrl && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[240px]">
                          {session.pageUrl}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-foreground">{session.browser || '—'}</p>
                      {session.os && (
                        <p className="text-xs text-muted-foreground">{session.os}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">
                      {formatDuration(session.duration)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {session.hasErrors ? (
                        <Badge className="bg-red-500 text-white text-xs">
                          {session.errorCount} error{session.errorCount !== 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500 text-white text-xs">Clean</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {new Date(session.lastSeen).toLocaleString('en-GB')}
                    </td>
                    <td className="px-4 py-3">
                      {session.url && (
                        <a
                          href={session.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open session replay in LogRocket`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {sessions.data?.total ?? 0} sessions
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
