import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { sendEmail } from '@/lib/operator/smtp';

// POST /api/operator/email/test-send  { to, subject, body }
// Sends a campaign draft to ONE test address so an operator can preview the real
// rendered email BEFORE launching to real leads. Isolated: no engine tables, no
// ops.leads, no inbox thread, no contacted marks — just an SMTP send with sample
// merge values. Auth-gated (operator roles).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Fill {name}/{business}/{category} with friendly sample values for the preview.
function sampleMerge(tpl: string): string {
  const map: Record<string, string> = {
    name: 'there',
    business: 'your business',
    category: 'your services',
  };
  return tpl.replace(/\{(\w+)\}/g, (m, k: string) => map[k.toLowerCase()] ?? m);
}

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let b: { to?: unknown; subject?: unknown; body?: unknown };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const to = (b.to ?? '').toString().trim();
  const subject = (b.subject ?? '').toString().trim();
  const body = (b.body ?? '').toString();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ error: 'a valid test email is required' }, { status: 400 });
  }
  if (!subject && !body.trim()) {
    return NextResponse.json({ error: 'subject or body required' }, { status: 400 });
  }

  try {
    const text = `${sampleMerge(body)}\n\n— (this is a TEST send from Zinga OS)`;
    const { messageId } = await sendEmail({
      to,
      subject: `[TEST] ${subject || 'Zinga campaign preview'}`,
      text,
    });
    return NextResponse.json({ ok: true, to, messageId });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'send failed' }, { status: 500 });
  }
}
