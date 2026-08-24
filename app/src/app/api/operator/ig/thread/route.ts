import { NextResponse } from 'next/server';
import { requireIgDemo } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET /api/operator/ig/thread?igsid=…
// Auth-gated. Returns the full message history (in/out bubbles, oldest-first) for
// one conversation from the PRIVATE ops.ig_messages table. Read-only.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const gate = await requireIgDemo();
  if ('response' in gate) return gate.response;

  const { searchParams } = new URL(req.url);
  const igsid = (searchParams.get('igsid') ?? '').trim();
  if (!igsid) return NextResponse.json({ error: 'igsid required' }, { status: 400 });

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_ig_thread', {
    p_igsid: igsid,
    p_limit: 100,
  });
  if (error) {
    console.error('operator/ig/thread RPC error', error.message);
    return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 });
  }
  return NextResponse.json({ igsid, messages: data ?? [] });
}
