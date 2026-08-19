import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { storeTelemetryEvent } from '@/lib/telemetry';

export const runtime = 'nodejs';

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.LOGROCKET_WEBHOOK_SECRET;
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
  const signature = req.headers.get('x-logrocket-signature') ?? '';

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const session = body.session as Record<string, unknown> | undefined;
  if (!session) {
    return NextResponse.json({ ok: true });
  }

  const identity = session.identity as Record<string, unknown> | undefined;
  const errors = (session.errors as { message: string; file: string; line: number }[] | undefined) ?? [];

  try {
    await storeTelemetryEvent({
      provider: 'logrocket',
      type: String(body.type ?? 'session'),
      customerUid: String(identity?.uid ?? 'anonymous'),
      deviceId: String(session.id ?? 'unknown'),
      sessionId: String(session.id ?? 'unknown'),
      timestamp: new Date(String(session.startTime ?? Date.now())),
      data: {
        sessionId: String(session.id ?? ''),
        url: String(session.url ?? ''),
        pageUrl: String(session.pageUrl ?? (session as Record<string, unknown>).href ?? ''),
        duration: Number(session.duration ?? 0),
        hasErrors: errors.length > 0,
        errorCount: errors.length,
        errors,
        os: String(session.os ?? session.userAgent ?? ''),
        browser: String(session.browser ?? ''),
        identity: {
          uid: String(identity?.uid ?? ''),
          name: String(identity?.name ?? ''),
          email: String(identity?.email ?? ''),
        },
      },
    });
  } catch (err) {
    console.error('LogRocket webhook storage error:', err);
    // Still return 200 — LogRocket retries on non-2xx
  }

  return NextResponse.json({ ok: true });
}
