import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET /api/operator/messenger/threads
// Auth-gated. Lists STORED Facebook Messenger conversations (one row per PSID,
// most-recent first) captured by the shared Meta webhook into the PRIVATE
// ops.messenger_messages table. Read-only.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_messenger_threads', { p_limit: 50 });
  if (error) {
    console.error('operator/messenger/threads RPC error', error.message);
    return NextResponse.json({ error: 'Failed to load threads' }, { status: 500 });
  }
  return NextResponse.json({ threads: data ?? [] });
}
