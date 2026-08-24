// Server-only multi-provider LLM layer for Zinga's AI drafts. Tries OpenAI first
// (gpt-4o), falls back to Claude (Anthropic) if OpenAI is unset or errors, and
// throws only if BOTH are unavailable — callers then fall back to their
// deterministic template. Keys (OPENAI_API_KEY / ANTHROPIC_API_KEY) are read
// server-side and NEVER exposed to the browser. Draft/show/wait still holds:
// output is only ever a DRAFT the operator approves before sending.
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

// True if at least one provider key is configured.
export function llmConfigured(): boolean {
  return !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

let _openai: OpenAI | null = null;
function openai(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}
let _anthropic: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

// Shared voice. Mirrors context/voice.md + tools/draft_outreach_batch.py:
// warm, concise, human, never corporate/salesy, DM-length, no invented facts.
export const ZINGA_VOICE =
  'You write short direct messages for Zinga, a NYC-area services marketplace ' +
  'where customers book local service pros (barbers, stylists, nail techs, ' +
  'photographers, massage, auto). Voice: warm, concise, human, specific — never ' +
  'salesy, corporate, or generic. Keep it DM-length (2–4 short sentences). ' +
  'Never invent facts, numbers, or claims. Do not use hashtags. Emojis only if ' +
  'genuinely natural (at most one). You are Bara, who runs Zinga.';

async function viaOpenAI(system: string, user: string, maxTokens: number): Promise<string> {
  const res = await openai().responses.create({
    model: OPENAI_MODEL,
    input: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_output_tokens: maxTokens,
  });
  const text = (res.output_text ?? '').trim();
  if (!text) throw new Error('empty OpenAI completion');
  return text;
}

async function viaClaude(system: string, user: string, maxTokens: number): Promise<string> {
  const res = await anthropic().messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
  let text = '';
  for (const block of res.content) {
    if (block.type === 'text') text += block.text;
  }
  text = text.trim();
  if (!text) throw new Error('empty Claude completion');
  return text;
}

// Generate a completion. Returns the text AND which provider served it. Tries
// OpenAI, then Claude; throws only when both are unavailable/failing.
export async function generate(
  system: string,
  user: string,
  maxTokens = 320,
): Promise<{ text: string; provider: 'openai' | 'anthropic' }> {
  const errors: string[] = [];

  if (process.env.OPENAI_API_KEY) {
    try {
      return { text: await viaOpenAI(system, user, maxTokens), provider: 'openai' };
    } catch (e) {
      errors.push(`openai: ${e instanceof Error ? e.message : e}`);
    }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return { text: await viaClaude(system, user, maxTokens), provider: 'anthropic' };
    } catch (e) {
      errors.push(`anthropic: ${e instanceof Error ? e.message : e}`);
    }
  }

  throw new Error(`no LLM provider available (${errors.join('; ') || 'no keys set'})`);
}
