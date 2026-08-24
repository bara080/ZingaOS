import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// POST /api/operator/crm/lead-add  { business?, instagram?, email?, source? }
// Adds a lead to ops.leads (stage=prospect), dedup-safe. Returns the new id, or
// added:false when a dedup conflict skipped it.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let body: { business?: string; instagram?: string; email?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const business = (body.business ?? '').trim();
  const instagram = (body.instagram ?? '').trim().replace(/^@/, '');
  const email = (body.email ?? '').trim();
  if (!business && !instagram && !email) {
    return NextResponse.json({ error: 'provide a business, @handle, or email' }, { status: 400 });
  }

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_lead_add', {
    p_business: business,
    p_instagram: instagram,
    p_email: email,
    p_source: (body.source ?? 'manual').toString(),
    p_actor: gate.session.email,
  });
  if (error) {
    console.error('operator_lead_add error', error.message);
    return NextResponse.json({ error: 'Failed to add lead' }, { status: 500 });
  }
  return NextResponse.json({ added: data != null, id: data ?? null });
}
