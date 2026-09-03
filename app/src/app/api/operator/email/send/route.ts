import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/operator/smtp';

// POST /api/operator/email/send  { contact, subject, body, inReplyTo? }
// Auth-gated. Sends ONE 1:1 email reply to a contact over the Gmail SMTP bridge
// (info@zingaapp.com), then persists the outbound message into ops.email_messages
// so it shows in the thread. Every send is audited (action email.send). This is a
// human-reviewed reply that only fires on this authenticated click — no auto-send.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let body: { contact?: string; subject?: string; body?: string; inReplyTo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const contact = (body.contact ?? '').toString().trim().toLowerCase();
  const subject = (body.subject ?? '').toString().trim() || 'Re: your message';
  const text = (body.body ?? '').toString().trim();
  const inReplyTo = (body.inReplyTo ?? '').toString().trim() || undefined;

  if (!contact) return NextResponse.json({ error: 'contact required' }, { status: 400 });
  if (!contact.includes('@')) return NextResponse.json({ error: 'contact must be an email' }, { status: 400 });
  if (!text) return NextResponse.json({ error: 'body required' }, { status: 400 });

  let result: { messageId: string };
  try {
    result = await sendEmail({ to: contact, subject, text, inReplyTo });
  } catch (e) {
    const admin = createServiceClient();
    try {
      await admin.rpc('operator_audit_insert', {
        p_actor: gate.session.email,
        p_action: 'email.send',
        p_detail: `contact=${contact} FAILED: ${e instanceof Error ? e.message : 'error'}`,
      });
    } catch {
      /* ignore audit failure */
    }
    return NextResponse.json(
      { error: `Send failed: ${e instanceof Error ? e.message : 'error'}` },
      { status: 502 },
    );
  }

  const admin = createServiceClient();
  let id: number | null = null;
  try {
    const { data } = await admin.rpc('operator_email_store_outbound', {
      p_contact: contact,
      p_subject: subject,
      p_body: text,
      p_message_id: result.messageId,
    });
    id = data != null ? Number(data) : null;
    await admin.rpc('operator_audit_insert', {
      p_actor: gate.session.email,
      p_action: 'email.send',
      p_detail: `contact=${contact} ok message_id=${result.messageId}`,
    });
  } catch {
    /* ignore persistence/audit failure — the email was already sent */
  }

  return NextResponse.json({ ok: true, id });
}
