import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { getDb, ensureStripeIndexes } from '@/lib/db';

export const runtime = 'nodejs';

// Two Stripe accounts point at this endpoint. Whichever secret validates the
// signature tells us which account sent the event — that's the `business` flag.
const SECRETS: { business: boolean; secret: string | undefined }[] = [
  { business: false, secret: process.env.STRIPE_WEBHOOK_SECRET },
  { business: true, secret: process.env.STRIPE_BUSINESS_WEBHOOK_SECRET },
];

const TOLERANCE_SECONDS = 300;

/** Parses Stripe's `t=<ts>,v1=<sig>,v1=<sig>` signature header. */
function parseSignature(header: string): { timestamp: number; signatures: string[] } {
  let timestamp = 0;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const [key, value] = part.split('=', 2);
    if (key === 't') timestamp = Number(value);
    else if (key === 'v1' && value) signatures.push(value);
  }
  return { timestamp, signatures };
}

function matches(expected: string, signatures: string[]): boolean {
  const expectedBuf = Buffer.from(expected, 'hex');
  return signatures.some((sig) => {
    try {
      const received = Buffer.from(sig, 'hex');
      return received.length === expectedBuf.length && timingSafeEqual(expectedBuf, received);
    } catch {
      return false;
    }
  });
}

/** Returns the `business` flag of the account whose secret validates, or null. */
function verifySignature(rawBody: string, header: string): boolean | null {
  if (!header) return null;

  const { timestamp, signatures } = parseSignature(header);
  if (!timestamp || signatures.length === 0) return null;

  // Reject replays of an old, previously-valid payload.
  if (Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) return null;

  const signedPayload = `${timestamp}.${rawBody}`;
  for (const { business, secret } of SECRETS) {
    if (!secret) continue;
    const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');
    if (matches(expected, signatures)) return business;
  }
  return null;
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const business = verifySignature(rawBody, req.headers.get('stripe-signature') ?? '');

  if (business === null) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventId = String(body.id ?? '');
  const type = String(body.type ?? '');
  if (!eventId || !type) {
    return NextResponse.json({ ok: true });
  }

  const object = (body.data as Record<string, unknown> | undefined)?.object as
    | Record<string, unknown>
    | undefined;

  try {
    const db = await getDb('ZG');
    await ensureStripeIndexes();

    await db.collection('stripe_events').updateOne(
      { eventId, business },
      {
        $setOnInsert: {
          eventId,
          business,
          type,
          livemode: Boolean(body.livemode),
          // Present on Connect events; absent on direct platform events.
          connectedAccountId: body.account ? String(body.account) : null,
          objectId: object?.id ? String(object.id) : null,
          objectType: object?.object ? String(object.object) : null,
          amount: typeof object?.amount === 'number' ? object.amount / 100 : null,
          currency: object?.currency ? String(object.currency) : null,
          status: object?.status ? String(object.status) : null,
          createdAt: new Date(Number(body.created ?? Date.now() / 1000) * 1000),
          receivedAt: new Date(),
        },
      },
      { upsert: true },
    );
  } catch (err) {
    console.error('Stripe webhook storage error:', err);
    // Still return 200 — Stripe retries on non-2xx.
  }

  return NextResponse.json({ ok: true });
}
