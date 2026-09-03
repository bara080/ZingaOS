import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { llmConfigured, generate, ZINGA_VOICE } from '@/lib/llm';

// POST /api/operator/email/draft  { contact }
// Auth-gated. Generates a Zinga-voice email reply DRAFT for a conversation. This
// ONLY drafts — it never sends. The operator reviews/edits the returned text and,
// if approved, sends it through /api/operator/email/send (draft / show / wait).
//
// Prefers a real LLM draft (OpenAI gpt-4o → Claude) using the recent thread as
// context; falls back to a deterministic template when no provider is configured.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function templateDraft(): string {
  return (
    'Thanks for getting back to me! I run Zinga — a NYC-area marketplace where ' +
    'customers book local service pros directly. Happy to walk you through how ' +
    'listing works (it\'s free to get set up). What\'s the best way to help?\n\n' +
    'Best,\nBara / Zinga — zingaapp.com'
  );
}

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let body: { contact?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const contact = (body.contact ?? '').toString().trim().toLowerCase();
  if (!contact) return NextResponse.json({ error: 'contact required' }, { status: 400 });

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_email_thread', {
    p_contact: contact,
    p_limit: 100,
  });
  if (error) {
    console.error('operator/email/draft thread RPC error', error.message);
    return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 });
  }

  const messages = (data ?? []) as {
    direction: string;
    subject: string | null;
    body: string | null;
  }[];

  // Most recent inbound subject → the reply subject (prefixed with Re: if needed).
  let lastSubject = '';
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].direction === 'in' && messages[i].subject) {
      lastSubject = messages[i].subject as string;
      break;
    }
  }
  const subject = lastSubject
    ? /^re:/i.test(lastSubject)
      ? lastSubject
      : `Re: ${lastSubject}`
    : 'Re: your message';

  if (llmConfigured()) {
    try {
      const transcript = messages
        .slice(-10)
        .map((m) => `${m.direction === 'out' ? 'Zinga (us)' : 'Them'}: ${m.body ?? ''}`)
        .join('\n');
      const system =
        ZINGA_VOICE +
        ' You are replying inside an existing EMAIL conversation. Write ONLY the ' +
        'next reply email body as Bara — a couple of short paragraphs, no subject ' +
        'line, sign off simply ("Best, Bara / Zinga"). Move the conversation ' +
        'toward getting the provider listed on Zinga (free). Ask one simple ' +
        'question when it helps.';
      const user = `Conversation so far:\n${transcript || '(no prior messages)'}\n\nWrite Zinga's next reply email.`;
      const { text, provider } = await generate(system, user, 400);
      return NextResponse.json({ draft: text, subject, source: provider });
    } catch (e) {
      console.warn('[email/draft] LLM failed, using template:', e instanceof Error ? e.message : e);
    }
  }

  return NextResponse.json({ draft: templateDraft(), subject, source: 'template' });
}
