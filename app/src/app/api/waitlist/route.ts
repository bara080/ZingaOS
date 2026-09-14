import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/admin';

// POST /api/waitlist  { email, name?, company?, note?, website? }
//
// PUBLIC endpoint (no auth) — the "Request access" waitlist form on the marketing
// landing posts here. It is deliberately quiet: it never reveals whether an email
// already existed and always returns { ok: true } on a valid submission, so the
// list can't be probed. `website` is a honeypot: real users never see or fill it,
// so a non-empty value is a bot and is silently dropped.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().max(200).optional(),
  company: z.string().trim().max(200).optional(),
  note: z.string().trim().max(2000).optional(),
  website: z.string().optional(), // honeypot — must be empty
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'a valid email is required' }, { status: 400 });
  }

  const { email, name, company, note, website } = parsed.data;

  // Honeypot: a bot filled the hidden field. Pretend success, insert nothing.
  if (website && website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const userAgent = req.headers.get('user-agent') ?? '';

  try {
    const admin = createServiceClient();
    await admin.rpc('waitlist_add', {
      p_email: email,
      p_name: name ?? null,
      p_company: company ?? null,
      p_note: note ?? null,
      p_source: 'landing',
      p_user_agent: userAgent,
    });

    // Best-effort audit — never let a logging failure affect the response.
    try {
      await admin.rpc('operator_audit_insert', {
        p_actor: 'public',
        p_action: 'waitlist.add',
        p_detail: `source=landing email=${email}`,
      });
    } catch {
      /* ignore audit failure */
    }
  } catch {
    // Do not leak internal errors (incl. whether the row already existed).
    return NextResponse.json({ error: 'could not process request' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
