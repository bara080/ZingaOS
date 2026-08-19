import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET /api/operator/logs
// Auth-gated. Returns the ops.audit trail (recent scrape/send/DM actions) that the
// Logs section renders. Read-only.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  try {
    const admin = createServiceClient();
    const { data, error } = await admin.rpc('operator_audit_list', { p_limit: 40 });
    if (error) return NextResponse.json({ audit: [], error: error.message });
    const audit = (data ?? []).map(
      (r: { at: string; actor: string | null; action: string; detail: string | null }) => {
        const t = (r.at ?? '').replace('T', ' ').slice(0, 19);
        return `${t}  ${r.action}  ${r.detail ?? ''}  · ${r.actor ?? ''}`;
      },
    );
    return NextResponse.json({ audit, runs: [] });
  } catch (e) {
    return NextResponse.json({ audit: [], error: e instanceof Error ? e.message : 'logs failed' });
  }
}
