import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { SmtpClient, buildOutreachMessage } from '@/lib/operator/smtp';

// POST /api/operator/send-batch  { src, limit }
// Auth-gated. Sends ONE SMALL CAPPED BATCH of real cold email over SMTP, marks the
// sent leads `contacted` in ops.leads, and audits every attempt. NO long sleep
// loop (serverless time limit): repeated clicks in the UI continue the campaign.
//
// GUARDRAILS:
//  • limit clamped server-side: default 5, HARD MAX 10 per call.
//  • sender identity: OUTREACH_FROM must be a @zingaapp.com address (never a
//    personal inbox) — mirrors the refusal in tools/smtp_send.py.
//  • only fires on this authenticated request; there is no cron / auto-send.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HARD_MAX = 10;
const BUSINESS_DOMAIN = '@zingaapp.com';
const DEFAULT_SUBJECT = 'quick question about your business';

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let body: { src?: string; limit?: unknown };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const srcRaw = (body.src ?? '').toString().trim();
  const src = srcRaw === '' || srcRaw === 'all' ? null : srcRaw;
  const limit = Math.max(1, Math.min(HARD_MAX, Math.floor(Number(body.limit) || 5)));

  // ── env / identity gates ──────────────────────────────────────────────────
  const host = process.env.SMTP_HOST ?? '';
  const port = Number(process.env.SMTP_PORT ?? '587') || 587;
  const user = process.env.SMTP_USER ?? '';
  const password = process.env.SMTP_PASSWORD ?? '';
  const from = process.env.OUTREACH_FROM ?? '';
  const canSpamAddress = process.env.CAN_SPAM_ADDRESS ?? '';

  if (!host || !user || !password) {
    return NextResponse.json(
      { error: 'SMTP not configured (SMTP_HOST / SMTP_USER / SMTP_PASSWORD)' },
      { status: 500 },
    );
  }
  if (!from.toLowerCase().endsWith(BUSINESS_DOMAIN)) {
    return NextResponse.json(
      { error: `OUTREACH_FROM must be a ${BUSINESS_DOMAIN} address (got '${from || 'unset'}')` },
      { status: 400 },
    );
  }
  if (!canSpamAddress) {
    return NextResponse.json(
      { error: 'CAN_SPAM_ADDRESS not set — a physical mailing address is required in the footer' },
      { status: 400 },
    );
  }

  const admin = createServiceClient();

  // ── fetch the next uncontacted emailable batch ────────────────────────────
  const { data: batch, error: batchErr } = await admin.rpc('operator_next_batch', {
    p_source: src,
    p_limit: limit,
  });
  if (batchErr) {
    return NextResponse.json({ error: batchErr.message }, { status: 500 });
  }
  const recipients: { id: number; email: string; business: string | null }[] = batch ?? [];
  if (!recipients.length) {
    return NextResponse.json({ sent: 0, failed: 0, remaining: 0, results: [], note: 'nothing pending' });
  }

  // ── send (one login, N transactions; no sleep) ────────────────────────────
  const results: { email: string; ok: boolean; error?: string }[] = [];
  const sentIds: number[] = [];
  let client: SmtpClient | null = null;
  try {
    client = await SmtpClient.connect({ host, port, user, password });
  } catch (e) {
    await admin.rpc('operator_audit_insert', {
      p_actor: gate.session.email,
      p_action: 'send.error',
      p_detail: `SMTP connect failed: ${e instanceof Error ? e.message : e}`,
    });
    return NextResponse.json(
      { error: `SMTP connect failed: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }

  for (const r of recipients) {
    const subject = DEFAULT_SUBJECT;
    try {
      const message = buildOutreachMessage({ from, to: r.email, subject, canSpamAddress });
      await client.sendMessage(from, r.email, message);
      results.push({ email: r.email, ok: true });
      sentIds.push(r.id);
    } catch (e) {
      results.push({ email: r.email, ok: false, error: e instanceof Error ? e.message : 'send failed' });
    }
  }
  await client.quit();

  // ── mark sent leads contacted + audit ─────────────────────────────────────
  let marked = 0;
  if (sentIds.length) {
    const { data: markData } = await admin.rpc('operator_mark_contacted', {
      p_ids: sentIds,
      p_subject: DEFAULT_SUBJECT,
    });
    marked = Number(markData) || 0;
  }
  const failed = results.filter((r) => !r.ok).length;
  await admin.rpc('operator_audit_insert', {
    p_actor: gate.session.email,
    p_action: 'send.batch',
    p_detail: `src=${srcRaw || 'all'} sent=${sentIds.length} failed=${failed} marked=${marked} from=${from}`,
  });

  // remaining pending for this source (so the UI knows whether to keep going)
  const { data: counts } = await admin.rpc('operator_campaign_counts', { p_source: src });
  const remaining = Number((counts ?? [])[0]?.pending) || 0;

  return NextResponse.json({
    sent: sentIds.length,
    failed,
    marked,
    remaining,
    results,
  });
}
