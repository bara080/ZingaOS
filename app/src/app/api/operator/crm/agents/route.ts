import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET  /api/operator/crm/agents  → list AI agent configs (newest first)
// POST /api/operator/crm/agents  → create an AI agent config
// Operator-gated; all DB access via SECURITY DEFINER RPCs (service_role only).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_agents_list');
  if (error) {
    console.error('operator_agents_list error', error.message);
    return NextResponse.json({ error: 'Failed to load agents' }, { status: 500 });
  }
  return NextResponse.json({ agents: data ?? [] });
}

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let body: {
    name?: string;
    role?: string;
    tone?: string;
    goal?: string;
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    escalation?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const name = (body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const rawTemp = Number(body.temperature);
  const temperature = Number.isFinite(rawTemp) ? Math.max(0, Math.min(2, rawTemp)) : 0.5;

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_agent_create', {
    p_name: name,
    p_role: (body.role ?? '').toString(),
    p_tone: (body.tone ?? '').toString(),
    p_goal: (body.goal ?? '').toString(),
    p_system_prompt: (body.systemPrompt ?? '').toString(),
    p_model: (body.model ?? 'gpt-4').toString(),
    p_temperature: temperature,
    p_escalation: (body.escalation ?? '').toString(),
    p_actor: gate.session.email,
  });
  if (error) {
    console.error('operator_agent_create error', error.message);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data });
}
