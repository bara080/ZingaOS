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
import { ExternalLink, GitBranch, GitCommit } from 'lucide-react';
import type { VercelSummary, DeploymentsResponse, DeploymentState } from '@/features/vercel/types';

const chartConfig = {
  deployments: { label: 'Successful', color: 'var(--chart-1)' },
  failures: { label: 'Failed', color: 'var(--chart-5)' },
} satisfies ChartConfig;

const STATE_BADGE: Record<DeploymentState, string> = {
  READY: 'bg-emerald-500 text-white',
  ERROR: 'bg-red-500 text-white',
  BUILDING: 'bg-blue-500 text-white',
  CANCELED: 'bg-slate-500 text-white',
  QUEUED: 'bg-amber-500 text-white',
};

const STATE_DOT: Record<DeploymentState, string> = {
  READY: 'text-emerald-500',
  ERROR: 'text-red-500',
  BUILDING: 'text-blue-400',
  CANCELED: 'text-slate-400',
  QUEUED: 'text-amber-500',
};

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

async function fetchSummary(): Promise<VercelSummary> {
  const res = await fetch('/api/trackers/vercel/summary');
  if (!res.ok) throw new Error('Failed to fetch Vercel summary');
  return res.json();
}

async function fetchDeployments(params: {
  page: number;
  target: string;
  state: string;
}): Promise<DeploymentsResponse> {
  const query = new URLSearchParams({ page: String(params.page) });
  if (params.target !== 'all') query.set('target', params.target);
  if (params.state !== 'all') query.set('state', params.state);
  const res = await fetch(`/api/trackers/vercel/deployments?${query}`);
  if (!res.ok) throw new Error('Failed to fetch deployments');
  return res.json();
}

export default function VercelPage() {
  const [targetFilter, setTargetFilter] = useState<'all' | 'production' | 'preview'>('all');
  const [stateFilter, setStateFilter] = useState<'all' | DeploymentState>('all');
  const [page, setPage] = useState(1);

  const summary = useQuery<VercelSummary>({
    queryKey: ['vercel-summary'],
    queryFn: fetchSummary,
    staleTime: 5 * 60 * 1000,
  });

  const deployments = useQuery<DeploymentsResponse>({
    queryKey: ['vercel-deployments', page, targetFilter, stateFilter],
    queryFn: () => fetchDeployments({ page, target: targetFilter, state: stateFilter }),
    staleTime: 2 * 60 * 1000,
  });

  const totalPages = deployments.data
    ? Math.ceil(deployments.data.total / (deployments.data.pageSize ?? 20))
    : 1;

  const last = summary.data?.lastDeployment;

  const statCards = [
    {
      label: 'Total Deployments',
      display: (summary.data?.totalDeployments ?? 0).toLocaleString(),
      sub: '7 days',
      color: 'text-foreground',
    },
    {
      label: 'Successful',
      display: (summary.data?.successfulDeployments ?? 0).toLocaleString(),
      color: 'text-emerald-500',
    },
    {
      label: 'Failed',
      display: (summary.data?.failedDeployments ?? 0).toLocaleString(),
      color: (summary.data?.failedDeployments ?? 0) > 0 ? 'text-red-500' : 'text-foreground',
    },
    {
      label: 'Avg Build Time',
      display: formatDuration(summary.data?.avgBuildDuration ?? null),
      color: 'text-foreground',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Vercel — Deployments</h1>

      {/* Last deployment banner */}
      <Card className="bg-primary-foreground">
        <CardContent className="pt-4">
          {summary.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-3 w-48" />
            </div>
          ) : !last ? (
            <p className="text-sm text-muted-foreground">No deployments recorded yet</p>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={STATE_BADGE[last.state] ?? ''}>
                    {last.state}
                  </Badge>
                  {last.target && (
                    <Badge variant="outline" className="text-xs">
                      {last.target}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(last.createdAt).toLocaleString('en-GB')}
                  </span>
                </div>
                {last.commitMessage && (
                  <p className="text-sm font-medium text-foreground leading-snug">
                    {last.commitMessage}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {last.branch && (
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {last.branch}
                    </span>
                  )}
                  {last.commit && (
                    <span className="flex items-center gap-1">
                      <GitCommit className="h-3 w-3" />
                      {last.commit}
                    </span>
                  )}
                  {last.buildDuration != null && (
                    <span>Built in {formatDuration(last.buildDuration)}</span>
                  )}
                </div>
              </div>
              {last.url && (
                <a
                  href={`https://${last.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open latest deployment"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
                  {stat.sub && (
                    <p className="text-xs text-muted-foreground">{stat.sub}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend chart */}
      <Card className="bg-primary-foreground">
        <CardHeader>
          <CardTitle className="text-sm">Deployment Trend (7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.isLoading ? (
            <div className="h-[180px] animate-pulse rounded-md bg-muted" />
          ) : (summary.data?.trend.length ?? 0) === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
              No deployment data yet
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[180px] w-full">
              <BarChart data={summary.data!.trend}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="deployments" fill="var(--color-deployments)" radius={4} />
                <Bar dataKey="failures" fill="var(--color-failures)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Deployments table */}
      <Card className="bg-primary-foreground">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm">All Deployments</CardTitle>
          <div className="flex gap-2">
            <Select
              value={targetFilter}
              onValueChange={(v) => {
                setTargetFilter(v as 'all' | 'production' | 'preview');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All targets</SelectItem>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="preview">Preview</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={stateFilter}
              onValueChange={(v) => {
                setStateFilter(v as 'all' | DeploymentState);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                <SelectItem value="READY">Ready</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="BUILDING">Building</SelectItem>
                <SelectItem value="CANCELED">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th aria-hidden="true" className="text-left px-4 py-2 w-6" />
                  <th scope="col" className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">
                    Commit
                  </th>
                  <th scope="col" className="text-left px-4 py-2 text-xs text-muted-foreground font-medium hidden md:table-cell">
                    Branch
                  </th>
                  <th scope="col" className="text-left px-4 py-2 text-xs text-muted-foreground font-medium hidden md:table-cell">
                    State
                  </th>
                  <th scope="col" className="text-right px-4 py-2 text-xs text-muted-foreground font-medium hidden lg:table-cell">
                    Build time
                  </th>
                  <th scope="col" className="text-right px-4 py-2 text-xs text-muted-foreground font-medium">
                    Deployed
                  </th>
                  <th aria-hidden="true" className="px-4 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {deployments.isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={7} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))}
                {!deployments.isLoading && (deployments.data?.data.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No deployments found
                    </td>
                  </tr>
                )}
                {deployments.data?.data.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className={`text-xs ${STATE_DOT[d.state] ?? 'text-slate-400'}`}>●</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground text-xs leading-snug line-clamp-1">
                        {d.commitMessage || '—'}
                      </p>
                      {d.commit && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{d.commit}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-muted-foreground">{d.branch || '—'}</p>
                      {d.target && (
                        <Badge variant="outline" className="text-xs mt-0.5">
                          {d.target}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge className={`text-xs ${STATE_BADGE[d.state] ?? ''}`}>
                        {d.state}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground hidden lg:table-cell">
                      {formatDuration(d.buildDuration)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {new Date(d.createdAt).toLocaleString('en-GB')}
                    </td>
                    <td className="px-4 py-3">
                      {d.url && (
                        <a
                          href={`https://${d.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open deployment for ${d.commitMessage || d.commit}`}
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
                Page {page} of {totalPages} · {deployments.data?.total ?? 0} deployments
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
