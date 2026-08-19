import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { sendDm, metaConfigured } from '@/lib/operator/meta';

// POST /api/operator/ig/send  { igsid, text }
// Auth-gated. Sends ONE real Instagram DM to a chosen IGSID (must already be in an
// open conversation — see /ig/conversations). GUARDRAIL: only fires on this
// authenticated click; every send is audited. Cold handles cannot be reached here.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const conf = metaConfigured();
  if (!conf.ok) return NextResponse.json({ error: conf.error }, { status: 500 });

  let body: { igsid?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const igsid = (body.igsid ?? '').toString().trim();
  const text = (body.text ?? '').toString().trim();
  if (!igsid) return NextResponse.json({ error: 'igsid required' }, { status: 400 });
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });

  const result = await sendDm(igsid, text);

  try {
    const admin = createServiceClient();
    await admin.rpc('operator_audit_insert', {
      p_actor: gate.session.email,
      p_action: 'ig.send',
      p_detail:
        'error' in result
          ? `igsid=${igsid} FAILED: ${result.error}`
          : `igsid=${igsid} ok message_id=${result.messageId}`,
    });
  } catch {
    /* ignore audit failure */
  }

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true, messageId: result.messageId });
}
