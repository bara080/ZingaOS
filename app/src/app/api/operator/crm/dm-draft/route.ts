import { NextResponse } from 'next/server';
import { requireIgDemo } from '@/lib/operator/guard';
import { llmConfigured, generate, ZINGA_VOICE } from '@/lib/llm';

// POST /api/operator/crm/dm-draft  { name?, business?, category?, borough?, instruction?, base? }
// Generates (or, with `instruction`+`base`, REWRITES) a first-touch cold intro DM
// in Zinga's voice. `instruction` is a free-text operator steer ("shorter",
// "more casual", or anything typed via the DM Queue "Custom" chip); `base` is the
// current draft to rewrite. Falls back to a deterministic template. Draft only.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Zinga's current cold-DM copy (also the DM Queue default in crm/api.ts draftDm).
// {username} is a mail-merge placeholder filled per-lead by fillTemplate().
function template(): string {
  return (
    'Hey {username}, love your work on here! 🔥\n' +
    'We’re launching Zinga app to send new clients straight to top beauty and ' +
    'grooming pros. We handle the discovery, upfront payments so you can focus ' +
    'strictly on clients. You keep full control of your rates, scheduling and ' +
    'hours. Think of us like Uber for beauty and grooming pros.\n' +
    'Open to taking on extra bookings this month? download Zinga app in the app store'
  );
}

export async function POST(req: Request) {
  const gate = await requireIgDemo();
  if ('response' in gate) return gate.response;

  let b: {
    name?: string;
    business?: string;
    category?: string;
    borough?: string;
    instruction?: string;
    base?: string;
  };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const name = (b.business || b.name || 'your business').toString().trim();
  const category = (b.category || '').toString().trim();
  const borough = (b.borough || '').toString().trim();
  const instruction = (b.instruction || '').toString().trim().slice(0, 400);
  const base = (b.base || '').toString().trim().slice(0, 2000);

  // Zinga's current value prop, for the model to stay on-message.
  const VALUE_PROP =
    'Zinga is launching an app that sends new clients straight to top beauty and ' +
    'grooming pros. Zinga handles discovery and upfront payments so the pro focuses ' +
    'strictly on clients; the pro keeps full control of their rates, scheduling and ' +
    'hours. Frame it like "Uber for beauty and grooming pros." End with a light ' +
    'question about taking on extra bookings this month and tell them to download ' +
    'the Zinga app in the app store. IMPORTANT: preserve any {curly_brace} ' +
    'placeholders (e.g. {username}) EXACTLY as written — they are mail-merge ' +
    'tokens filled in per-lead later; never replace or remove them.';

  if (llmConfigured()) {
    try {
      const who = `${name}${category ? ` · ${category}` : ''}${borough ? ` · ${borough}` : ''}`;
      let system: string;
      let user: string;

      if (instruction) {
        // Operator steer (Shorter / Casual / Formal / a custom typed instruction).
        system =
          ZINGA_VOICE +
          ' You are refining a cold outreach DM to a prospective beauty/grooming ' +
          'provider. ' + VALUE_PROP + ' Follow the operator instruction exactly. ' +
          'No signature. Output ONLY the message text. ' +
          `Operator instruction: ${instruction}`;
        user = base
          ? `Provider: ${who}.\n\nCurrent draft:\n"""${base}"""\n\nRewrite it per the instruction.`
          : `Provider: ${who}. Write the intro DM per the instruction.`;
      } else {
        // Fresh first-touch generate.
        system =
          ZINGA_VOICE +
          ' Write a FIRST-TOUCH cold outreach DM to a prospective beauty/grooming ' +
          'provider. Address them by the literal token {username} (kept verbatim) — ' +
          'e.g. start "Hey {username}, ...". Open with a genuine compliment on their ' +
          'work. ' + VALUE_PROP +
          ' No signature. Output ONLY the message text.';
        user = `Provider: ${who}. Write the intro DM.`;
      }

      const { text, provider } = await generate(system, user);
      return NextResponse.json({ draft: text, source: provider });
    } catch (e) {
      console.warn('[crm/dm-draft] LLM failed, using template:', e instanceof Error ? e.message : e);
    }
  }

  return NextResponse.json({ draft: template(), source: 'template' });
}
