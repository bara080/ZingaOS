import { NextResponse } from 'next/server';
import { requireIgDemo } from '@/lib/operator/guard';
import { llmConfigured, generate, ZINGA_VOICE, ZINGA_LINKS, ZINGA_LINKS_LINE } from '@/lib/llm';

// POST /api/operator/crm/dm-draft  { name?, business?, category?, borough? }
// Generates a first-touch cold intro DM for a lead in Zinga's voice (gpt-4o).
// Falls back to a deterministic template if no key / the call fails. Draft only.
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

  let b: { name?: string; business?: string; category?: string; borough?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const name = (b.business || b.name || 'your business').toString().trim();
  const category = (b.category || '').toString().trim();
  const borough = (b.borough || '').toString().trim();

  if (llmConfigured()) {
    try {
      const system =
        ZINGA_VOICE +
        ' Write a FIRST-TOUCH cold outreach DM to a prospective provider. Be ' +
        'specific and genuine (reference their business/category/area), lead with ' +
        'value (free listing, fills mid-week gaps, direct bookings), and end with a ' +
        'light question. Include Zinga\'s destinations so they can act directly — ' +
        'the website AND both app-store links (iOS and Android) — as a short line ' +
        `near the end, exactly: ${ZINGA_LINKS_LINE}. No signature. Output ONLY the message text.`;
      const user = `Provider: ${name}${category ? ` · ${category}` : ''}${borough ? ` · ${borough}` : ''}. Write the intro DM.`;
      const { text, provider } = await generate(system, user);
      return NextResponse.json({ draft: text, source: provider });
    } catch (e) {
      console.warn('[crm/dm-draft] LLM failed, using template:', e instanceof Error ? e.message : e);
    }
  }

  return NextResponse.json({ draft: template(name, category, borough), source: 'template' });
}
