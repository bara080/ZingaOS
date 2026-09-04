import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/admin';

// Meta / Instagram messaging webhook.
//
// This route is called by Meta UNAUTHENTICATED. It must NOT sit behind the
// Supabase auth middleware. `src/middleware.ts` only matches /console,
// /admin-users, /settings, /api-doc — so /api/meta/webhook is not gated.
//
// Env required (server-side; set in .env.local locally + Vercel prod):
//   META_APP_SECRET             — HMAC key for X-Hub-Signature-256 verification
//   META_WEBHOOK_VERIFY_TOKEN   — the token you enter in the Meta dashboard
//
// SECURITY: never auto-reply or send from this scaffold. Inbound only.

// Force the Node runtime so `crypto` and raw-body handling behave.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — Meta webhook verification handshake.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  // .trim() the incoming token AND the env value — dashboard-pasted env vars
  // often carry stray whitespace, which silently breaks the equality check.
  const token = (searchParams.get('hub.verify_token') ?? '').trim();
  const challenge = searchParams.get('hub.challenge');
  const expected = (process.env.META_WEBHOOK_VERIFY_TOKEN ?? '').trim();

  if (mode === 'subscribe' && expected && token === expected) {
    // Echo the challenge back as plain text with a 200.
    return new NextResponse(challenge ?? '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// POST — inbound messaging events from Meta.
export async function POST(req: Request) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    // Misconfiguration — fail closed. (Do not process unverifiable payloads.)
    console.error('[meta/webhook] META_APP_SECRET is not set; rejecting.');
    return new NextResponse('Server not configured', { status: 500 });
  }

  // Read the RAW body BEFORE parsing — the HMAC is over the exact bytes.
  const rawBody = await req.text();

  const signatureHeader = req.headers.get('x-hub-signature-256') || '';
  const expectedSignature =
    'sha256=' +
    crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

  if (!signatureIsValid(signatureHeader, expectedSignature)) {
    console.warn('[meta/webhook] invalid X-Hub-Signature-256; rejecting.');
    return new NextResponse('Invalid signature', { status: 401 });
  }

  // Signature verified — now it's safe to parse.
  let body: MetaWebhookBody;
  try {
    body = JSON.parse(rawBody) as MetaWebhookBody;
  } catch {
    return new NextResponse('Bad JSON', { status: 400 });
  }

  // Branch on the webhook object. Instagram DMs arrive as object='instagram';
  // Facebook Messenger (Page) DMs arrive as object='page'. Both share this same
  // webhook, signature, and handshake — we just persist into the right table.
  try {
    if (body.object === 'page') {
      await persistMessenger(body);
    } else {
      // Default / 'instagram' path — unchanged IG behavior.
      await persistInstagram(body);
    }
  } catch (e) {
    console.error('[meta/webhook] persist error', e instanceof Error ? e.message : e);
  }

  // Acknowledge fast so Meta doesn't retry.
  return new NextResponse('EVENT_RECEIVED', { status: 200 });
}

// ── Instagram DMs (object === 'instagram') — unchanged behavior ─────────────
async function persistInstagram(body: MetaWebhookBody) {
  // Our own IG business id — used to drop echoes of messages WE sent.
  const selfId = process.env.META_IG_USER_ID ?? '';

  // Persist every genuine inbound message. This is wrapped so a DB hiccup can
  // never turn into a non-200 back to Meta (which would trigger redelivery
  // storms). Dedup of redeliveries is handled DB-side by the unique mid index
  // (ON CONFLICT DO NOTHING in operator_ig_store_inbound).
  const admin = createServiceClient();
  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const senderId = event.sender?.id; // the person's IGSID
      const recipientId = event.recipient?.id; // our IG business id
      const text = event.message?.text;
      const mid = event.message?.mid;
      const isEcho = event.message?.is_echo === true;

      // Structured log — NEVER include message text (it is provider/customer
      // PII and must not reach stdout or logs). Only structural metadata.
      console.log(
        '[meta/webhook] ig inbound',
        JSON.stringify({
          senderId,
          recipientId,
          mid,
          isEcho,
          hasText: typeof text === 'string' && text.length > 0,
          timestamp: event.timestamp,
        }),
      );

      // Skip echoes (messages we sent) and anything originating from our own
      // IG user id — we only store genuine inbound DMs.
      if (isEcho) continue;
      if (!senderId) continue;
      if (selfId && String(senderId) === String(selfId)) continue;

      // Nothing to store for non-text events (e.g. reactions, read receipts).
      if (typeof text !== 'string' || text.length === 0) continue;

      // SECURITY: never auto-reply here. Zinga OS rule is draft/show/wait —
      // any reply goes through the human-approved /api/operator/ig/send path,
      // NEVER from inside this webhook.
      try {
        await admin.rpc('operator_ig_store_inbound', {
          p_igsid: String(senderId),
          p_username: null,
          p_text: text,
          p_mid: mid ?? null,
          p_raw: event as unknown as Record<string, unknown>,
        });
      } catch (e) {
        // Log WITHOUT message text; keep processing the rest of the batch.
        console.error('[meta/webhook] ig store_inbound failed', e instanceof Error ? e.message : e);
      }
    }
  }
}

// ── Facebook Messenger / Page DMs (object === 'page') ───────────────────────
// Same entry[].messaging[] shape. Recipients are addressed by PSID
// (event.sender.id). We skip our own echoes and delivery/read receipts, then
// persist genuine inbound into ops.messenger_messages (dedup on mid, idempotent).
async function persistMessenger(body: MetaWebhookBody) {
  const admin = createServiceClient();
  for (const entry of body.entry ?? []) {
    // For 'page', entry.id is the Page id; fall back to the configured Page id.
    const pageId = String(entry.id ?? process.env.MESSENGER_PAGE_ID ?? '');
    for (const event of entry.messaging ?? []) {
      const senderId = event.sender?.id; // the person's PSID
      const recipientId = event.recipient?.id; // our Page id
      const text = event.message?.text;
      const mid = event.message?.mid;
      const isEcho = event.message?.is_echo === true;
      const attachments = event.message?.attachments;

      // Structured log — NEVER include message text (provider/customer PII).
      console.log(
        '[meta/webhook] messenger inbound',
        JSON.stringify({
          senderId,
          recipientId,
          mid,
          isEcho,
          hasText: typeof text === 'string' && text.length > 0,
          hasAttachments: Array.isArray(attachments) && attachments.length > 0,
          isDelivery: !!event.delivery,
          isRead: !!event.read,
          timestamp: event.timestamp,
        }),
      );

      // Skip echoes (our own outbound), delivery + read receipts, and anything
      // with no PSID — we only store genuine inbound DMs.
      if (isEcho) continue;
      if (event.delivery || event.read) continue;
      if (!senderId) continue;

      // Nothing to store when there is neither text nor attachments.
      const hasText = typeof text === 'string' && text.length > 0;
      const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
      if (!hasText && !hasAttachments) continue;

      // SECURITY: never auto-reply here. draft/show/wait — any reply goes through
      // the human-approved /api/operator/messenger/send path only.
      try {
        await admin.rpc('operator_messenger_store_inbound', {
          p_page_id: pageId,
          p_psid: String(senderId),
          p_mid: mid ?? null,
          p_body: hasText ? text : null,
          p_attachments: hasAttachments
            ? (attachments as unknown as Record<string, unknown>)
            : null,
          p_sender_name: null,
          p_provider_ts:
            typeof event.timestamp === 'number'
              ? new Date(event.timestamp).toISOString()
              : null,
        });
      } catch (e) {
        // Log WITHOUT message text; keep processing the rest of the batch.
        console.error(
          '[meta/webhook] messenger store_inbound failed',
          e instanceof Error ? e.message : e,
        );
      }
    }
  }
}

// Constant-time comparison to avoid leaking timing information.
function signatureIsValid(received: string, expected: string): boolean {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// --- Minimal types for the Instagram + Messenger messaging payloads we consume. ---
interface MetaMessage {
  mid?: string;
  text?: string;
  is_echo?: boolean;
  attachments?: unknown[];
}

interface MetaMessagingEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: MetaMessage;
  // Messenger-only event kinds we explicitly skip (not stored).
  delivery?: unknown;
  read?: unknown;
}

interface MetaEntry {
  id?: string;
  time?: number;
  messaging?: MetaMessagingEvent[];
}

interface MetaWebhookBody {
  object?: string;
  entry?: MetaEntry[];
}
