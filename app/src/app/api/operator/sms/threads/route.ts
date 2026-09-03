import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET /api/operator/sms/threads
// Auth-gated. Lists STORED SMS conversations (one row per phone, most-recent
// first, with the number's consent status) from the PRIVATE ops.sms_messages
// table. Read-only.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_sms_threads', { p_limit: 100 });
  if (error) {
    console.error('operator/sms/threads RPC error', error.message);
    return NextResponse.json({ error: 'Failed to load threads' }, { status: 500 });
  }
  return NextResponse.json({ threads: data ?? [] });
}
