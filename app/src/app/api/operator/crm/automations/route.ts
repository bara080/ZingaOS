import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET  /api/operator/crm/automations  → list automation rules (newest first)
// POST /api/operator/crm/automations  → create an automation rule
// Operator-gated; all DB access via SECURITY DEFINER RPCs (service_role only).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_automations_list');
  if (error) {
    console.error('operator_automations_list error', error.message);
    return NextResponse.json({ error: 'Failed to load automations' }, { status: 500 });
  }
  return NextResponse.json({ rules: data ?? [] });
}

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let body: { name?: string; trigger?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const name = (body.name ?? '').trim();
  const trigger = (body.trigger ?? '').trim();
  const action = (body.action ?? '').trim();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  if (!trigger) return NextResponse.json({ error: 'trigger required' }, { status: 400 });
  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 });

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_automation_create', {
    p_name: name,
    p_trigger: trigger,
    p_action: action,
    p_actor: gate.session.email,
  });
  if (error) {
    console.error('operator_automation_create error', error.message);
    return NextResponse.json({ error: 'Failed to create automation' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data });
}
