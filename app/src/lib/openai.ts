// Server-only OpenAI client + Zinga-voice draft helpers. Used by the CRM/operator
// draft endpoints (DM Queue intro, Inbox AI reply). The API key is read from
// OPENAI_API_KEY and NEVER exposed to the browser. If the key is missing or a
// call fails, callers fall back to their deterministic template — draft/show/wait
// still holds (output is only ever a DRAFT the operator approves before sending).
import OpenAI from 'openai';

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

export function openaiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
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

// Single-shot generation via the Responses API. Throws on failure (caller falls
// back to a template).
export async function generate(system: string, user: string, maxTokens = 320): Promise<string> {
  const res = await client().responses.create({
    model: OPENAI_MODEL,
    input: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_output_tokens: maxTokens,
  });
  const text = (res.output_text ?? '').trim();
  if (!text) throw new Error('empty completion');
  return text;
}
