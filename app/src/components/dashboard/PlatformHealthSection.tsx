'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSentryHealth } from '@/hooks/useSentryHealth';
import type { SentrySummary } from '@/features/sentry/types';

function levelColor(level: string) {
  if (level === 'fatal' || level === 'error') return 'text-red-500';
  if (level === 'warning') return 'text-amber-500';
  return 'text-blue-400';
}

function crashFreeColor(rate: number | null) {
  if (rate === null) return 'text-muted-foreground';
  if (rate >= 99) return 'text-emerald-500';
  if (rate >= 95) return 'text-amber-500';
  return 'text-red-500';
}

function errorRateColor(rate: number | null) {
  if (rate === null) return 'text-muted-foreground';
  if (rate < 1) return 'text-amber-500';
  return 'text-red-500';
}

function openIssuesColor(count: number) {
  return count > 0 ? 'text-red-500' : 'text-emerald-500';
}

function SentryPanel({ data }: { data: SentrySummary }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Open Issues</p>
          <p className={`text-2xl font-bold ${openIssuesColor(data.openIssues)}`}>
            {data.openIssues}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Crash-Free</p>
          <p className={`text-2xl font-bold ${crashFreeColor(data.crashFreeRate)}`}>
            {data.crashFreeRate != null ? `${data.crashFreeRate}%` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Error Rate</p>
          <p className={`text-2xl font-bold ${errorRateColor(data.errorRate)}`}>
            {data.errorRate != null ? `${data.errorRate}%` : '—'}
          </p>
        </div>
      </div>

      {data.recentIssues.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Recent Issues
          </p>
          {data.recentIssues.map((issue) => (
            <div
              key={issue.issueId}
              className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`shrink-0 text-xs ${levelColor(issue.level)}`}>●</span>
                <span className="truncate text-foreground">{issue.title}</span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                {new Date(issue.lastSeen).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="text-right">
        <Link href="/analytics/sentry" className="text-xs text-primary hover:underline">
          View all →
        </Link>
      </div>
    </div>
  );
}

function SentryPanelSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}

export function PlatformHealthSection() {
  const { data, isLoading, isError } = useSentryHealth();

  return (
    <Card className="bg-primary-foreground">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Platform Health — Sentry</CardTitle>
        {!isLoading && !isError && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && <SentryPanelSkeleton />}
        {isError && (
          <p className="text-sm text-muted-foreground">
            Could not load Sentry data. Check your API credentials.
          </p>
        )}
        {!isLoading && !isError && data && <SentryPanel data={data} />}
      </CardContent>
    </Card>
  );
}
