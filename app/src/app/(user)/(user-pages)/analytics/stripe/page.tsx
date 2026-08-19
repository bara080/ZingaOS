'use client';

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  CreditCard,
  Webhook,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  Building2,
  Landmark,
} from 'lucide-react';

import { PageHeader } from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import SectionBlock from '@/components/common/SectionBlock';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

type StripeAnalytics = {
  webhook: { counts: Record<string, number>; total: number; connectDelivered: boolean };
  pipeline: { status: string; count: number; total: number }[];
  owed: { pending: number; available: number };
  stores: { total: number; withAccount: number; withoutAccount: number };
  stripe: null | {
    accounts: number;
    enabled: number;
    restricted: number;
    orphan: number;
    danglingStoreRefs: number;
    platformAvailable: number | null;
    platformPending: number | null;
  };
  stripeConfigured: boolean;
  generatedAt: string;
};

const chartConfig = {
  count: { label: 'Payments', color: 'var(--chart-1)' },
} satisfies ChartConfig;

async function fetchStripe(): Promise<StripeAnalytics> {
  const res = await fetch('/api/analytics/stripe');
  if (!res.ok) throw new Error('Failed to fetch Stripe analytics');
  return res.json();
}

const usd = (n: number | null | undefined) =>
  n == null ? '—' : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SkeletonGrid = ({ n = 4 }: { n?: number }) => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: n }).map((_, i) => (
      <Skeleton key={i} className="h-24 w-full" />
    ))}
  </div>
);

export default function StripeAnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', 'stripe'],
    queryFn: fetchStripe,
    refetchInterval: 60_000,
  });

  const wh = data?.webhook;
  const releasing = data?.pipeline.find((p) => p.status === 'releasing')?.count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stripe"
        description="Connect payouts, escrow pipeline, and webhook health"
        icon={<CreditCard className="h-6 w-6" />}
      />

      {error && (
        <Card>
          <CardContent className="py-6 text-sm text-rose-600">Failed to load Stripe analytics.</CardContent>
        </Card>
      )}

      {/* Webhook health */}
      <SectionBlock title="Webhook health — connected-account events">
        {isLoading || !wh ? (
          <SkeletonGrid />
        ) : (
          <>
            <div className="mb-3">
              {wh.connectDelivered ? (
                <Badge className="bg-emerald-600 text-white">Connect events delivered ✓</Badge>
              ) : (
                <Badge className="bg-rose-600 text-white">
                  {'⚠ No connect events received — webhook not subscribed'}
                </Badge>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard title="account.updated" value={String(wh.counts['account.updated'] ?? 0)} Icon={Webhook} desc="flag-sync source" />
              <StatCard title="payout.paid" value={String(wh.counts['payout.paid'] ?? 0)} Icon={Webhook} desc="wallet-reconcile source" />
              <StatCard title="payout.failed" value={String(wh.counts['payout.failed'] ?? 0)} Icon={Webhook} desc="balance-restore source" />
              <StatCard title="payment_intent.succeeded" value={String(wh.counts['payment_intent.succeeded'] ?? 0)} Icon={CheckCircle2} desc="platform events (control)" />
            </div>
          </>
        )}
      </SectionBlock>

      {/* Escrow pipeline */}
      <SectionBlock title="Escrow pipeline — payments by status">
        {isLoading || !data ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            {releasing > 0 && (
              <div className="mb-3">
                <Badge className="bg-amber-500 text-white">{`${releasing} stuck in "releasing"`}</Badge>
              </div>
            )}
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart data={data.pipeline} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="status" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </>
        )}
      </SectionBlock>

      {/* Connected accounts + reconcile */}
      <SectionBlock title="Connected accounts — business platform">
        {isLoading ? (
          <SkeletonGrid />
        ) : data?.stripe ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Connected accounts" value={String(data.stripe.accounts)} Icon={Building2} desc={`${data.stripe.enabled} enabled · ${data.stripe.restricted} restricted`} />
            <StatCard title="Orphan accounts" value={String(data.stripe.orphan)} Icon={AlertTriangle} desc="Stripe acct, no store" />
            <StatCard title="Dangling store refs" value={String(data.stripe.danglingStoreRefs)} Icon={AlertTriangle} desc="store → missing acct" />
            <StatCard title="Platform balance" value={usd(data.stripe.platformAvailable)} Icon={Landmark} desc="escrow held on Stripe" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Stripe API key not configured — set <code>STRIPE_SECRET_KEY</code> (restricted, read-only) to show connected-account + balance metrics.
          </p>
        )}
      </SectionBlock>

      {/* Wallet vs Stripe drift */}
      <SectionBlock title="Wallet owed vs Stripe (drift)">
        {isLoading || !data ? (
          <SkeletonGrid />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Owed — available" value={usd(data.owed.available)} Icon={Wallet} desc="SP wallets, withdrawable" />
            <StatCard title="Owed — pending (escrow)" value={usd(data.owed.pending)} Icon={Wallet} desc="SP wallets, in escrow" />
            <StatCard title="Stores linked" value={`${data.stores.withAccount}/${data.stores.total}`} Icon={Building2} desc={`${data.stores.withoutAccount} unlinked`} />
            <StatCard title="Platform on Stripe" value={usd(data.stripe?.platformAvailable ?? null)} Icon={Landmark} desc="vs owed = drift" />
          </div>
        )}
      </SectionBlock>

      {data?.generatedAt && (
        <p className="text-xs text-muted-foreground">Updated {new Date(data.generatedAt).toLocaleString()}</p>
      )}
    </div>
  );
}
