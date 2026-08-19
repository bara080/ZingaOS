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
import type { SentrySummary, SentryIssuesResponse, SentryIssueLevel } from '@/features/sentry/types';

const chartConfig = {
  count: { label: 'Errors', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const LEVEL_BADGE: Record<SentryIssueLevel, string> = {
  fatal: 'bg-red-600 text-white',
  error: 'bg-red-500 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-blue-500 text-white',
  debug: 'bg-slate-500 text-white',
};

const LEVEL_DOT: Record<SentryIssueLevel, string> = {
  fatal: 'text-red-600',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-400',
  debug: 'text-slate-400',
};

async function fetchSummary(): Promise<SentrySummary> {
  const res = await fetch('/api/trackers/sentry/summary');
  if (!res.ok) throw new Error('Failed to fetch Sentry summary');
  return res.json();
}

async function fetchIssues(params: { page: number; level: string }): Promise<SentryIssuesResponse> {
  const query = new URLSearchParams({ page: String(params.page) });
  if (params.level !== 'all') query.set('level', params.level);
  const res = await fetch(`/api/trackers/sentry/issues?${query}`);
  if (!res.ok) throw new Error('Failed to fetch Sentry issues');
  return res.json();
}

export default function SentryPage() {
  const [levelFilter, setLevelFilter] = useState<'all' | SentryIssueLevel>('all');
  const [page, setPage] = useState(1);

  const summary = useQuery<SentrySummary>({
    queryKey: ['sentry-summary'],
    queryFn: fetchSummary,
    staleTime: 5 * 60 * 1000,
  });

  const issues = useQuery<SentryIssuesResponse>({
    queryKey: ['sentry-issues', page, levelFilter],
    queryFn: () => fetchIssues({ page, level: levelFilter }),
    staleTime: 2 * 60 * 1000,
  });

  const totalPages = issues.data ? Math.ceil(issues.data.total / (issues.data.pageSize ?? 20)) : 1;
  const sevenDayTotal = summary.data?.trend.reduce((s, d) => s + d.count, 0) ?? 0;

  const statCards = [
    {
      label: 'Open Issues',
      value: summary.data?.openIssues ?? 0,
      display: String(summary.data?.openIssues ?? 0),
      color: (summary.data?.openIssues ?? 0) > 0 ? 'text-red-500' : 'text-emerald-500',
    },
    {
      label: 'Crash-Free Rate',
      display: summary.data?.crashFreeRate != null ? `${summary.data.crashFreeRate}%` : '—',
      color:
        summary.data?.crashFreeRate == null
          ? 'text-muted-foreground'
          : summary.data.crashFreeRate >= 99
            ? 'text-emerald-500'
            : summary.data.crashFreeRate >= 95
              ? 'text-amber-500'
              : 'text-red-500',
    },
    {
      label: 'Error Rate',
      display: summary.data?.errorRate != null ? `${summary.data.errorRate}%` : '—',
      color:
        summary.data?.errorRate == null
          ? 'text-muted-foreground'
          : summary.data.errorRate < 1
            ? 'text-amber-500'
            : 'text-red-500',
    },
    {
      label: '7-Day Errors',
      display: sevenDayTotal.toLocaleString(),
      color: 'text-foreground',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sentry — Error Monitoring</h1>

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
            <CardTitle className="text-sm">Error Trend (7 days)</CardTitle>
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
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-primary-foreground">
          <CardHeader>
            <CardTitle className="text-sm">Top Issues by Frequency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))
            ) : (summary.data?.topIssues.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No issues received yet
              </p>
            ) : (
              (() => {
                const max = Math.max(...summary.data!.topIssues.map((i) => i.count), 1);
                return summary.data!.topIssues.map((issue) => (
                  <div key={issue.issueId} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground truncate max-w-[75%]">{issue.title}</span>
                      <span className="text-muted-foreground">{issue.count.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-500"
                        style={{ width: `${(issue.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                ));
              })()
            )}
          </CardContent>
        </Card>
      </div>

      {/* Issue table */}
      <Card className="bg-primary-foreground">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">All Issues</CardTitle>
          <Select
            value={levelFilter}
            onValueChange={(v) => {
              setLevelFilter(v as 'all' | SentryIssueLevel);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Filter by level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="fatal">Fatal</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
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
                    Issue
                  </th>
                  <th scope="col" className="text-left px-4 py-2 text-xs text-muted-foreground font-medium hidden md:table-cell">
                    Level
                  </th>
                  <th scope="col" className="text-right px-4 py-2 text-xs text-muted-foreground font-medium hidden lg:table-cell">
                    Events
                  </th>
                  <th scope="col" className="text-right px-4 py-2 text-xs text-muted-foreground font-medium">
                    Last seen
                  </th>
                  <th aria-hidden="true" className="px-4 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {issues.isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={6} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))}
                {!issues.isLoading && (issues.data?.data.length ?? 0) === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      No issues found
                    </td>
                  </tr>
                )}
                {issues.data?.data.map((issue) => (
                  <tr
                    key={issue.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className={`text-xs ${LEVEL_DOT[issue.level] ?? 'text-slate-400'}`}>
                        ●
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground leading-snug">{issue.title}</p>
                      {issue.culprit && (
                        <p className="text-xs text-muted-foreground mt-0.5">{issue.culprit}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge className={`text-xs ${LEVEL_BADGE[issue.level] ?? ''}`}>
                        {issue.level}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">
                      {issue.count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {new Date(issue.lastSeen).toLocaleString('en-GB')}
                    </td>
                    <td className="px-4 py-3">
                      {issue.permalink && (
                        <a
                          href={issue.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open "${issue.title}" in Sentry`}
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
                Page {page} of {totalPages} · {issues.data?.total ?? 0} issues
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
