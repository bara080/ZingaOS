import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET /api/operator/sms/thread?phone=…
// Auth-gated. Returns the full message history (in/out, oldest-first) for one SMS
// conversation from the PRIVATE ops.sms_messages table. Read-only.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const { searchParams } = new URL(req.url);
  const phone = (searchParams.get('phone') ?? '').trim();
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_sms_thread', {
    p_phone: phone,
    p_limit: 200,
  });
  if (error) {
    console.error('operator/sms/thread RPC error', error.message);
    return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 });
  }
  return NextResponse.json({ phone, messages: data ?? [] });
}
