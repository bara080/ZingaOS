import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { storeTelemetryEvent } from '@/lib/telemetry';

export const runtime = 'nodejs';

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.SENTRY_WEBHOOK_SECRET;
  if (!secret || !signature?.startsWith('sha256=')) return false;
  const received = signature.slice(7);
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('sentry-hook-signature') ?? '';

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const resource = req.headers.get('sentry-hook-resource') ?? 'issue';

  // For 'issue' resource: payload is in body.issue
  // For alert resources (event_alert, metric_alert): payload is in body.data?.event
  const issue =
    resource === 'issue'
      ? (body.issue as Record<string, unknown> | undefined)
      : ((body.data as Record<string, unknown>)?.event as Record<string, unknown> | undefined);

  if (!issue) {
    return NextResponse.json({ ok: true });
  }

  try {
    await storeTelemetryEvent({
      provider: 'sentry',
      type: resource,
      customerUid: 'sentry',
      deviceId: 'sentry',
      sessionId: String(issue.id ?? 'unknown'),
      timestamp: new Date(String(issue.lastSeen ?? issue.dateLastSeen ?? Date.now())),
      data: {
        issueId: String(issue.id ?? ''),
        title: String(issue.title ?? ''),
        level: String(issue.level ?? 'error'),
        culprit: String(issue.culprit ?? ''),
        environment: String(
          (issue.project as Record<string, unknown>)?.slug ?? 'production',
        ),
        platform: String(issue.platform ?? ''),
        count: Number(issue.count ?? 0),
        firstSeen: String(issue.firstSeen ?? issue.dateCreated ?? new Date().toISOString()),
        lastSeen: String(issue.lastSeen ?? issue.dateLastSeen ?? new Date().toISOString()),
        permalink: String(issue.permalink ?? ''),
        ...(resource !== 'issue' ? { alertRule: String(body.action ?? '') } : {}),
      },
    });
  } catch (err) {
    console.error('Sentry webhook storage error:', err);
    // Still return 200 — Sentry retries on non-2xx
  }

  return NextResponse.json({ ok: true });
}
