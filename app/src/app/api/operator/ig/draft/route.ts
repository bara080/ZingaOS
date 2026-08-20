import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// POST /api/operator/ig/draft  { igsid }
// Auth-gated. Generates a Zinga-voice reply DRAFT for a conversation. This ONLY
// drafts — it never sends. The operator reviews/edits the returned text and, if
// they approve it, sends it through the existing /api/operator/ig/send path
// (draft / show / wait — a hard rule for this project).
//
// The draft is produced IN-PROCESS from a small set of intent templates. No
// external LLM is called (no key is wired), and message PII never transits an
// LLM transcript. Tone mirrors tools/draft_outreach_batch.py: warm, concise,
// NYC service-marketplace, signed "Bara / Zinga".
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Intent = 'greeting' | 'interested' | 'pricing' | 'generic';

// Classify the last inbound message into a coarse intent. Deliberately simple
// keyword matching — this is the seam an LLM would later replace.
function classify(text: string): Intent {
  const t = text.toLowerCase();
  if (/\b(price|pricing|cost|how much|rate|rates|fee|fees|charge)\b/.test(t)) return 'pricing';
  if (/\b(interested|sign up|signup|join|list|listed|onboard|how do i|how does|tell me more|more info)\b/.test(t))
    return 'interested';
  if (/\b(hi|hey|hello|yo|good morning|good afternoon|what's up|whats up|sup)\b/.test(t.trim()) && t.trim().length <= 40)
    return 'greeting';
  return 'generic';
}

// Zinga-voice reply templates. Kept short for DMs. Signed "Bara / Zinga".
// TODO: swap for LLM draft — replace this switch with a call to the model,
// feeding the recent thread as context. Keep the draft/show/wait contract:
// the output is still only a DRAFT the operator must approve before sending.
function draftFor(intent: Intent): string {
  switch (intent) {
    case 'greeting':
      return (
        'Hey! Thanks for reaching out. I\'m Bara — I run Zinga, where NYC ' +
        'customers book local service pros directly. Are you a provider looking ' +
        'to get listed, or a customer trying to book? Happy to point you the right way.\n\n' +
        'Bara / Zinga — zingaapp.com'
      );
    case 'interested':
      return (
        'Love it — glad you\'re interested! Getting listed on Zinga is free, and ' +
        'it\'s built to fill the mid-week gaps when your calendar is light. I just ' +
        'need a couple of details to set you up. Want me to send over the link?\n\n' +
        'Bara / Zinga — zingaapp.com'
      );
    case 'pricing':
      return (
        'Great question. Listing your business on Zinga is free — no upfront cost ' +
        'to be on the marketplace. We keep it simple so you only think about the ' +
        'bookings coming in. Want me to walk you through how it works?\n\n' +
        'Bara / Zinga — zingaapp.com'
      );
    default:
      return (
        'Thanks for the message! I\'m Bara from Zinga — NYC\'s marketplace for ' +
        'booking local service pros. Happy to help; can you tell me a little more ' +
        'about what you\'re looking for?\n\n' +
        'Bara / Zinga — zingaapp.com'
      );
  }
}

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let body: { igsid?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const igsid = (body.igsid ?? '').toString().trim();
  if (!igsid) return NextResponse.json({ error: 'igsid required' }, { status: 400 });

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_ig_thread', {
    p_igsid: igsid,
    p_limit: 100,
  });
  if (error) {
    console.error('operator/ig/draft thread RPC error', error.message);
    return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 });
  }

  // Find the most recent INBOUND message to react to (messages are oldest-first).
  const messages = (data ?? []) as { direction: string; text: string | null }[];
  let lastInbound = '';
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].direction === 'in' && messages[i].text) {
      lastInbound = messages[i].text as string;
      break;
    }
  }

  const intent = lastInbound ? classify(lastInbound) : 'generic';
  const draft = draftFor(intent);

  return NextResponse.json({ draft, intent });
}
