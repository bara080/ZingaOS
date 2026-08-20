import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET /api/operator/ig/threads
// Auth-gated. Lists STORED Instagram conversations (one row per igsid, most-recent
// first) captured by the Meta webhook into the PRIVATE ops.ig_messages table. This
// is distinct from /ig/conversations (which hits the live Meta Graph API for the
// 24h-window send list) — this reads our own persisted history. Read-only.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_ig_threads', { p_limit: 50 });
  if (error) {
    console.error('operator/ig/threads RPC error', error.message);
    return NextResponse.json({ error: 'Failed to load threads' }, { status: 500 });
  }
  return NextResponse.json({ threads: data ?? [] });
}
