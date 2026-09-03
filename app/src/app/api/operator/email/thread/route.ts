import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET /api/operator/email/thread?contact=…
// Auth-gated. Returns the full message history (in/out, oldest-first) for one
// email conversation from the PRIVATE ops.email_messages table. Read-only.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const { searchParams } = new URL(req.url);
  const contact = (searchParams.get('contact') ?? '').trim().toLowerCase();
  if (!contact) return NextResponse.json({ error: 'contact required' }, { status: 400 });

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_email_thread', {
    p_contact: contact,
    p_limit: 100,
  });
  if (error) {
    console.error('operator/email/thread RPC error', error.message);
    return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 });
  }
  return NextResponse.json({ contact, messages: data ?? [] });
}
