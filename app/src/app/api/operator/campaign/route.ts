import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET /api/operator/campaign?src=<source|all>
// Auth-gated. Returns emailable recipients + sent/pending counts for a source,
// pulled from the private ops.leads table via service-role RPCs. `src` empty or
// 'all' = every source. Read-only — no sending happens here.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Recipient = { id: number; email: string; biz: string; status: 'sent' | 'pending' };

export async function GET(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const srcRaw = new URL(req.url).searchParams.get('src')?.trim() ?? '';
  const src = srcRaw === '' || srcRaw === 'all' ? null : srcRaw;

  try {
    const admin = createServiceClient();
    const [{ data: recRows, error: recErr }, { data: countRows, error: countErr }] =
      await Promise.all([
        admin.rpc('operator_campaign_recipients', { p_source: src, p_limit: 1000 }),
        admin.rpc('operator_campaign_counts', { p_source: src }),
      ]);
    if (recErr || countErr) {
      return NextResponse.json(
        { error: (recErr ?? countErr)?.message ?? 'campaign query failed' },
        { status: 500 },
      );
    }
    const recipients: Recipient[] = (recRows ?? []).map(
      (r: { id: number; email: string; business: string | null; contacted_at: string | null }) => ({
        id: r.id,
        email: r.email,
        biz: r.business ?? '',
        status: r.contacted_at ? 'sent' : 'pending',
      }),
    );
    const c = (countRows ?? [])[0] ?? { sent: 0, pending: 0, total: 0 };
    return NextResponse.json({
      src: srcRaw || 'all',
      recipients,
      sent: Number(c.sent) || 0,
      pending: Number(c.pending) || 0,
      failed: 0, // per-message failures live in the audit trail, not on the lead
      total: Number(c.total) || 0,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'campaign failed' },
      { status: 500 },
    );
  }
}
