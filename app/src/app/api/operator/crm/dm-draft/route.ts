import { NextResponse } from 'next/server';
import { requireIgDemo } from '@/lib/operator/guard';
import { llmConfigured, generate, ZINGA_VOICE, ZINGA_LINKS, ZINGA_LINKS_LINE } from '@/lib/llm';

// POST /api/operator/crm/dm-draft  { name?, business?, category?, borough?, instruction?, base? }
// Generates (or, with `instruction`+`base`, REWRITES) a first-touch cold intro DM
// in Zinga's voice. `instruction` is a free-text operator steer ("shorter",
// "more casual", or anything typed via the DM Queue "Custom" chip); `base` is the
// current draft to rewrite. Falls back to a deterministic template. Draft only.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function template(name: string, category: string, borough: string): string {
  const cat = category.toLowerCase();
  const noun = cat.includes('barber') ? 'barbershops'
    : cat.includes('hair') || cat.includes('salon') || cat.includes('beauty') ? 'salons'
    : cat.includes('nail') ? 'nail studios'
    : cat.includes('photo') ? 'photographers'
    : cat.includes('massage') || cat.includes('spa') ? 'spas'
    : 'local businesses';
  const where = borough ? ` in ${borough}` : '';
  return (
    `Hey! Came across ${name}${where} and really love your work. We help ${noun} ` +
    `fill mid-week gaps and take bookings directly through Zinga — no cost to be ` +
    `listed. You can check it out at ${ZINGA_LINKS.web} or grab the app — ` +
    `iOS: ${ZINGA_LINKS.ios} · Android: ${ZINGA_LINKS.android}. ` +
    `Open to a quick 2-min look?`
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

  if (llmConfigured()) {
    try {
      const who = `${name}${category ? ` · ${category}` : ''}${borough ? ` · ${borough}` : ''}`;
      let system: string;
      let user: string;

      if (instruction) {
        // Operator steer (Shorter / Casual / Formal / a custom typed instruction).
        // Rewrite the current draft per the instruction; the operator's steer wins
        // (so "shorter" isn't forced to keep the full app-store links line).
        system =
          ZINGA_VOICE +
          ' You are refining a FIRST-TOUCH cold outreach DM to a prospective ' +
          'provider. Keep Zinga\'s value (free listing, fills mid-week gaps, direct ' +
          'bookings) and end with a light question. Follow the operator instruction ' +
          'exactly. No signature. Output ONLY the message text. ' +
          `Operator instruction: ${instruction}`;
        user = base
          ? `Provider: ${who}.\n\nCurrent draft:\n"""${base}"""\n\nRewrite it per the instruction.`
          : `Provider: ${who}. Write the intro DM per the instruction.`;
      } else {
        // Fresh first-touch generate — includes the site + both app-store links.
        system =
          ZINGA_VOICE +
          ' Write a FIRST-TOUCH cold outreach DM to a prospective provider. Be ' +
          'specific and genuine (reference their business/category/area), lead with ' +
          'value (free listing, fills mid-week gaps, direct bookings), and end with a ' +
          'light question. Include Zinga\'s destinations so they can act directly — ' +
          'the website AND both app-store links (iOS and Android) — as a short line ' +
          `near the end, exactly: ${ZINGA_LINKS_LINE}. No signature. Output ONLY the message text.`;
        user = `Provider: ${who}. Write the intro DM.`;
      }

      const { text, provider } = await generate(system, user);
      return NextResponse.json({ draft: text, source: provider });
    } catch (e) {
      console.warn('[crm/dm-draft] LLM failed, using template:', e instanceof Error ? e.message : e);
    }
  }

  return NextResponse.json({ draft: template(name, category, borough), source: 'template' });
}
