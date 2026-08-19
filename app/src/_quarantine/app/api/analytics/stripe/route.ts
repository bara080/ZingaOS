import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Restricted, read-only key preferred (rk_live_…). Degrades gracefully if unset:
// Mongo-sourced metrics still render; Stripe-sourced ones return null.
const STRIPE_KEY =
  process.env.STRIPE_SECRET_KEY || process.env.STRIPE_BUSINESS_SECRET_KEY || '';

type StripeAccount = {
  id: string;
  email?: string | null;
  payouts_enabled?: boolean;
  charges_enabled?: boolean;
};
type StripeList = { data: StripeAccount[]; has_more: boolean };
type StripeBalance = { available?: { amount: number }[]; pending?: { amount: number }[] };

async function stripeGet<T>(path: string): Promise<T | null> {
  if (!STRIPE_KEY) return null;
  try {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
      headers: { Authorization: `Bearer ${STRIPE_KEY}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function listAllAccounts(): Promise<StripeAccount[] | null> {
  if (!STRIPE_KEY) return null;
  const out: StripeAccount[] = [];
  let startingAfter = '';
  for (let i = 0; i < 50; i++) {
    const q = new URLSearchParams({ limit: '100' });
    if (startingAfter) q.set('starting_after', startingAfter);
    const page = await stripeGet<StripeList>(`accounts?${q.toString()}`);
    if (!page?.data) break;
    out.push(...page.data);
    if (!page.has_more) break;
    startingAfter = page.data[page.data.length - 1].id;
  }
  return out;
}

const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const sumBal = (arr?: { amount: number }[]) => (arr || []).reduce((s, x) => s + x.amount, 0) / 100;

export async function GET() {
  const [ZC, SP] = await Promise.all([getDb('ZC'), getDb('SP')]);

  // --- Webhook health (customer cluster) ---
  const webhookTypes = [
    'account.updated',
    'payout.paid',
    'payout.failed',
    'payout.canceled',
    'payment_intent.succeeded',
  ];
  const counts: Record<string, number> = {};
  for (const t of webhookTypes) {
    counts[t] = await ZC.collection('webhookevents').countDocuments({ type: t });
  }
  const totalWebhookEvents = await ZC.collection('webhookevents').estimatedDocumentCount();
  const connectDelivered = (counts['account.updated'] || 0) + (counts['payout.paid'] || 0) > 0;

  // --- Escrow pipeline (payments by status) ---
  const pipelineAgg = await ZC.collection('payments')
    .aggregate<{ _id: string | null; count: number; total: number }>([
      { $group: { _id: '$paymentStatus', count: { $sum: 1 }, total: { $sum: '$amountBreakdown.total' } } },
      { $sort: { count: -1 } },
    ])
    .toArray();
  const pipeline = pipelineAgg.map((r) => ({
    status: r._id || 'unknown',
    count: r.count,
    total: round2(r.total || 0),
  }));

  // --- Wallet owed (SP wallets) ---
  const walletAgg = await ZC.collection('wallets')
    .aggregate<{ pending: number; available: number }>([
      { $match: { ownerType: 'service-provider' } },
      { $group: { _id: null, pending: { $sum: '$pendingBalance' }, available: { $sum: '$balance' } } },
    ])
    .toArray();
  const owed = {
    pending: round2(walletAgg[0]?.pending || 0),
    available: round2(walletAgg[0]?.available || 0),
  };

  // --- Stores (service-provider cluster) ---
  const storesTotal = await SP.collection('stores').countDocuments({});
  const storesWithAccount = await SP.collection('stores').countDocuments({
    stripeAccountId: { $nin: [null, ''] },
  });

  // --- Stripe side (live) ---
  const accounts = await listAllAccounts();
  const balance = await stripeGet<StripeBalance>('balance');

  let stripe:
    | null
    | {
        accounts: number;
        enabled: number;
        restricted: number;
        orphan: number;
        danglingStoreRefs: number;
        platformAvailable: number | null;
        platformPending: number | null;
      } = null;

  if (accounts) {
    const enabled = accounts.filter((a) => a.payouts_enabled && a.charges_enabled).length;
    const storeAccts = await SP.collection('stores')
      .find<{ stripeAccountId: string }>({ stripeAccountId: { $nin: [null, ''] } })
      .project({ stripeAccountId: 1, _id: 0 })
      .toArray();
    const storeAcctIds = new Set(storeAccts.map((s) => s.stripeAccountId));
    const stripeIds = new Set(accounts.map((a) => a.id));
    const orphan = accounts.filter((a) => !storeAcctIds.has(a.id)).length;
    const danglingStoreRefs = [...storeAcctIds].filter((id) => !stripeIds.has(id)).length;
    stripe = {
      accounts: accounts.length,
      enabled,
      restricted: accounts.length - enabled,
      orphan,
      danglingStoreRefs,
      platformAvailable: balance ? round2(sumBal(balance.available)) : null,
      platformPending: balance ? round2(sumBal(balance.pending)) : null,
    };
  }

  return NextResponse.json({
    webhook: { counts, total: totalWebhookEvents, connectDelivered },
    pipeline,
    owed,
    stores: {
      total: storesTotal,
      withAccount: storesWithAccount,
      withoutAccount: storesTotal - storesWithAccount,
    },
    stripe,
    stripeConfigured: !!STRIPE_KEY,
    generatedAt: new Date().toISOString(),
  });
}
