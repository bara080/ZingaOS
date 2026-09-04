import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { llmConfigured, generate, ZINGA_VOICE } from '@/lib/llm';

// POST /api/operator/messenger/draft  { psid }
// Auth-gated. Generates a Zinga-voice reply DRAFT for a Messenger conversation.
// This ONLY drafts — it never sends. The operator reviews/edits the returned text
// and, if they approve it, sends it through /api/operator/messenger/send
// (draft / show / wait — a hard rule for this project).
//
// The LLM gets NO send tool and NO Page token (capability starvation). Voice
// rules come from context/voice.md: short, lead with booking, never invent
// numbers/prices (pricing routes to booking until provider price data exists).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Intent = 'greeting' | 'interested' | 'pricing' | 'generic';

// Classify the last inbound message into a coarse intent. Deliberately simple
// keyword matching — this is the seam an LLM would later replace.
function classify(text: string): Intent {
  const t = text.toLowerCase();
  if (/\b(price|pricing|cost|how much|rate|rates|fee|fees|charge)\b/.test(t)) return 'pricing';
  if (/\b(interested|sign up|signup|join|list|listed|onboard|how do i|how does|tell me more|more info|book|booking|appointment)\b/.test(t))
    return 'interested';
  if (/\b(hi|hey|hello|yo|good morning|good afternoon|what's up|whats up|sup)\b/.test(t.trim()) && t.trim().length <= 40)
    return 'greeting';
  return 'generic';
}

// Zinga-voice reply templates. Kept short for DMs. Pricing routes to booking —
// no invented numbers. Fallback only when no LLM provider is configured.
function draftFor(intent: Intent): string {
  switch (intent) {
    case 'greeting':
      return (
        'Hey! Thanks for reaching out. I\'m Bara — I run Zinga, where NYC ' +
        'customers book local service pros directly. Are you looking to book, ' +
        'or a provider wanting to get listed? Happy to point you the right way.'
      );
    case 'interested':
      return (
        'Love it! The easiest next step is to book right in the app — that locks ' +
        'in your spot and the time. Want me to send you the link to book?'
      );
    case 'pricing':
      return (
        'Great question — pricing depends on the pro and the service, and you\'ll ' +
        'see it right on their profile when you book in the app. Want me to send ' +
        'you the link so you can check availability and rates?'
      );
    default:
      return (
        'Thanks for the message! I\'m Bara from Zinga — NYC\'s marketplace for ' +
        'booking local service pros. Happy to help; can you tell me a little more ' +
        'about what you\'re looking for?'
      );
  }
}

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let body: { psid?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const psid = (body.psid ?? '').toString().trim();
  if (!psid) return NextResponse.json({ error: 'psid required' }, { status: 400 });

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_messenger_thread', {
    p_psid: psid,
    p_limit: 100,
  });
  if (error) {
    console.error('operator/messenger/draft thread RPC error', error.message);
    return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 });
  }

  // Find the most recent INBOUND message to react to (messages are oldest-first).
  const messages = (data ?? []) as { direction: string; body: string | null }[];
  let lastInbound = '';
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].direction === 'in' && messages[i].body) {
      lastInbound = messages[i].body as string;
      break;
    }
  }

  const intent = lastInbound ? classify(lastInbound) : 'generic';

  // Prefer a real LLM draft using the recent thread as context; fall back to the
  // deterministic template if no provider is configured or both error.
  if (llmConfigured()) {
    try {
      const transcript = messages
        .slice(-10)
        .map((m) => `${m.direction === 'out' ? 'Zinga (us)' : 'Them'}: ${m.body ?? ''}`)
        .join('\n');
      const system =
        ZINGA_VOICE +
        ' You are replying inside an existing Facebook Messenger conversation. Write ' +
        'ONLY the next reply message as Bara — no preamble, no quotes, no signature ' +
        '(this is mid-conversation). Lead with booking: move the person toward ' +
        'booking a local pro in the Zinga app. NEVER invent prices or numbers — if ' +
        'asked about price, say it shows on the pro\'s profile at booking and offer ' +
        'the link. Ask one simple question when it helps.';
      const user = `Conversation so far:\n${transcript || '(no prior messages)'}\n\nWrite Zinga's next reply.`;
      const { text, provider } = await generate(system, user);
      return NextResponse.json({ draft: text, intent, source: provider });
    } catch (e) {
      console.warn('[messenger/draft] LLM failed, using template:', e instanceof Error ? e.message : e);
    }
  }

  return NextResponse.json({ draft: draftFor(intent), intent, source: 'template' });
}
