import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// POST (or GET, for a cron) /api/operator/email/poll
// Auth-gated. Pulls NEW inbound mail from the Gmail IMAP mailbox (info@zingaapp.com)
// and stores each message into the PRIVATE ops.email_messages table, threaded by
// the contact's (FROM) address. Poll position is tracked in ops.email_poll_state
// via operator_email_poll_get/set so repeated calls only fetch unseen UIDs.
//
// GUARDRAILS: best-effort + robust — wrapped in try/catch, IMAP connection always
// closed in finally, and the mailbox password is never returned or logged. If IMAP
// creds are missing we return a clear { error } instead of crashing.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAILBOX = 'INBOX';

async function poll(actor: string) {
  const host = process.env.IMAP_HOST || 'imap.gmail.com';
  const user = process.env.IMAP_USER || process.env.SMTP_USER || '';
  const pass = process.env.IMAP_PASSWORD || process.env.SMTP_PASSWORD || '';

  if (!user || !pass) {
    return NextResponse.json(
      { error: 'IMAP not configured (IMAP_USER/IMAP_PASSWORD or SMTP_USER/SMTP_PASSWORD)' },
      { status: 500 },
    );
  }

  const ourAddress = user.toLowerCase();
  const admin = createServiceClient();

  // Current poll cursor for this mailbox.
  const { data: stateRows, error: stateErr } = await admin.rpc('operator_email_poll_get', {
    p_mailbox: MAILBOX,
  });
  if (stateErr) {
    return NextResponse.json({ error: `poll state read failed: ${stateErr.message}` }, { status: 500 });
  }
  const state = Array.isArray(stateRows) ? stateRows[0] : stateRows;
  const storedLastUid = Number(state?.last_uid ?? 0) || 0;
  const storedUidValidity = Number(state?.uid_validity ?? 0) || 0;

  const client = new ImapFlow({
    host,
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  let fetched = 0;
  let stored = 0;
  let skipped = 0;
  let maxUid = storedLastUid;

  try {
    await client.connect();
    const lock = await client.getMailboxLock(MAILBOX);
    try {
      const mailbox = client.mailbox;
      const uidValidity = mailbox && typeof mailbox !== 'boolean' ? Number(mailbox.uidValidity) : 0;

      // If UIDVALIDITY changed (mailbox rebuilt), UIDs are no longer comparable —
      // reset the cursor to 0 and re-scan from the start.
      let lastUid = storedLastUid;
      if (uidValidity && storedUidValidity && uidValidity !== storedUidValidity) {
        lastUid = 0;
        maxUid = 0;
      }

      // Fetch everything with UID greater than our cursor.
      const range = `${lastUid + 1}:*`;
      for await (const msg of client.fetch(
        range,
        { uid: true, source: true, envelope: true },
        { uid: true },
      )) {
        const uid = Number(msg.uid);
        // `1:*` can return the last message even when its UID <= lastUid — guard it.
        if (uid <= lastUid) continue;
        if (uid > maxUid) maxUid = uid;
        fetched++;

        try {
          const parsed = await simpleParser(msg.source as Buffer);
          const fromAddr =
            parsed.from?.value?.[0]?.address?.toLowerCase().trim() || '';
          const fromName = parsed.from?.value?.[0]?.name?.trim() || '';

          // Skip anything we sent ourselves (Gmail "All Mail"/sent copies).
          if (!fromAddr || fromAddr === ourAddress) {
            skipped++;
            continue;
          }

          const subject = (parsed.subject || '').trim();
          const text =
            (parsed.text && parsed.text.trim()) ||
            (parsed.html ? String(parsed.html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '') ||
            '';
          const messageId = (parsed.messageId || '').trim() || null;
          const inReplyTo = (parsed.inReplyTo || '').trim() || null;

          const { data: insertedId, error: storeErr } = await admin.rpc(
            'operator_email_store_inbound',
            {
              p_contact: fromAddr,
              p_name: fromName || null,
              p_subject: subject || null,
              p_body: text || null,
              p_message_id: messageId,
              p_in_reply_to: inReplyTo,
              p_raw: {
                uid,
                date: parsed.date ? parsed.date.toISOString() : null,
                from: fromAddr,
              },
            },
          );
          if (storeErr) {
            skipped++;
            continue;
          }
          // RPC returns null when deduped on message_id.
          if (insertedId != null) stored++;
          else skipped++;
        } catch {
          skipped++;
        }
      }

      // Persist the new cursor position.
      await admin.rpc('operator_email_poll_set', {
        p_mailbox: MAILBOX,
        p_last_uid: maxUid,
        p_uid_validity: uidValidity || storedUidValidity || 0,
      });
    } finally {
      lock.release();
    }
  } catch (e) {
    return NextResponse.json(
      { error: `IMAP poll failed: ${e instanceof Error ? e.message : 'error'}` },
      { status: 502 },
    );
  } finally {
    try {
      await client.logout();
    } catch {
      /* ignore close failure */
    }
  }

  try {
    await admin.rpc('operator_audit_insert', {
      p_actor: actor,
      p_action: 'email.poll',
      p_detail: `mailbox=${MAILBOX} fetched=${fetched} stored=${stored} skipped=${skipped}`,
    });
  } catch {
    /* ignore audit failure */
  }

  return NextResponse.json({ fetched, stored, skipped });
}

export async function POST() {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;
  return poll(gate.session.email);
}

// GET is also the Vercel cron entrypoint. A cron invocation carries
// `Authorization: Bearer $CRON_SECRET` (Vercel sets this when CRON_SECRET is
// configured); accept that, otherwise fall back to operator auth for manual calls.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') || '';
  if (secret && auth === `Bearer ${secret}`) {
    return poll('cron');
  }
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;
  return poll(gate.session.email);
}
