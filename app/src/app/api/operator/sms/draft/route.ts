import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { llmConfigured, generate, ZINGA_VOICE } from '@/lib/llm';

// POST /api/operator/sms/draft  { name?, business?, category?, borough?, base?, instruction? }
// Optional AI helper for the SMS composer. Generates (or rewrites `base`) a SHORT,
// compliant SMS reply in Zinga's voice — 1–2 sentences, under ~300 chars, no
// links unless natural, and ALWAYS ends with "Reply STOP to opt out". Falls back
// to a deterministic template. Draft only — the operator still reviews + sends,
// and the send route hard-gates on consent regardless.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function template(name: string): string {
  const who = name && name !== 'there' ? name : 'there';
  return (
    `Hi ${who}, it's Zinga — thanks for connecting! Want a quick hand getting ` +
    `your first bookings set up? Reply STOP to opt out.`
  );
}

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let b: {
    name?: string;
    business?: string;
    category?: string;
    borough?: string;
    base?: string;
    instruction?: string;
  };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const name = (b.business || b.name || 'there').toString().trim();
  const category = (b.category || '').toString().trim();
  const borough = (b.borough || '').toString().trim();
  const base = (b.base || '').toString().trim().slice(0, 800);
  const instruction = (b.instruction || '').toString().trim().slice(0, 300);

  if (!llmConfigured()) {
    return NextResponse.json({ draft: template(name), source: 'template' });
  }

  const RULES =
    'Write ONE short SMS (max ~300 characters, ideally 1–2 sentences). This is a ' +
    'consented A2P 10DLC text, so keep it plain, human, and non-spammy. Do NOT use ' +
    'markdown. End with "Reply STOP to opt out." Never invent facts or numbers.';
  const ctx = [
    name && `Recipient: ${name}`,
    category && `Category: ${category}`,
    borough && `Area: ${borough}`,
    base && `Current draft to rewrite: ${base}`,
    instruction && `Operator steer: ${instruction}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const { text, provider } = await generate(`${ZINGA_VOICE}\n\n${RULES}`, ctx || 'Write a friendly first SMS.', 160);
    return NextResponse.json({ draft: text, source: provider });
  } catch {
    return NextResponse.json({ draft: template(name), source: 'template' });
  }
}
