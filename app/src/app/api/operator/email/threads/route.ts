import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET /api/operator/email/threads
// Auth-gated. Lists STORED email conversations (one row per contact address,
// most-recent first) from the PRIVATE ops.email_messages table. Read-only.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_email_threads', { p_limit: 50 });
  if (error) {
    console.error('operator/email/threads RPC error', error.message);
    return NextResponse.json({ error: 'Failed to load threads' }, { status: 500 });
  }
  return NextResponse.json({ threads: data ?? [] });
}
