import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET /api/operator/messenger/thread?psid=…
// Auth-gated. Returns the full message history (in/out bubbles, oldest-first) for
// one conversation from the PRIVATE ops.messenger_messages table. Read-only.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const { searchParams } = new URL(req.url);
  const psid = (searchParams.get('psid') ?? '').trim();
  if (!psid) return NextResponse.json({ error: 'psid required' }, { status: 400 });

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_messenger_thread', {
    p_psid: psid,
    p_limit: 100,
  });
  if (error) {
    console.error('operator/messenger/thread RPC error', error.message);
    return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 });
  }
  return NextResponse.json({ psid, messages: data ?? [] });
}
