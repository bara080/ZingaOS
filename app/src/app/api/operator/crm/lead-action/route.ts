import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// POST /api/operator/crm/lead-action  { id, action, handle?, reason? }
// DM Queue ⋮ menu actions on a lead:
//   'skip'   → set stage 'skipped' (drops it from the DM Queue, keeps the lead)
//   'delete' → delete the lead record
//   'block'  → denylist the handle (future scrapes auto-drop it) AND delete matches
// Auth-gated (operator roles). Every action is audited.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Action = 'skip' | 'delete' | 'block';

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let b: { id?: unknown; action?: unknown; handle?: unknown; reason?: unknown };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const id = Number(b.id);
  const action = String(b.action) as Action;
  const handle = (b.handle ?? '').toString().trim();
  const reason = (b.reason ?? '').toString().trim() || null;

  const admin = createServiceClient();
  let removed = 0;

  try {
    if (action === 'delete') {
      if (!Number.isFinite(id)) return NextResponse.json({ error: 'id required' }, { status: 400 });
      const { error } = await admin.rpc('operator_lead_delete', { p_id: id });
      if (error) throw new Error(error.message);
      removed = 1;
    } else if (action === 'skip') {
      if (!Number.isFinite(id)) return NextResponse.json({ error: 'id required' }, { status: 400 });
      const { error } = await admin.rpc('operator_lead_set_stage', { p_id: id, p_stage: 'skipped' });
      if (error) throw new Error(error.message);
    } else if (action === 'block') {
      if (!handle) return NextResponse.json({ error: 'handle required' }, { status: 400 });
      const { data, error } = await admin.rpc('operator_lead_denylist_add', {
        p_handle: handle,
        p_reason: reason,
        p_actor: gate.session.email,
      });
      if (error) throw new Error(error.message);
      removed = Number(data) || 0;
    } else {
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'action failed' }, { status: 500 });
  }

  // Best-effort audit.
  try {
    await admin.rpc('operator_audit_insert', {
      p_actor: gate.session.email,
      p_action: `lead.${action}`,
      p_detail: action === 'block' ? `@${handle} · removed=${removed}` : `id=${id}`,
    });
  } catch {
    /* ignore */
  }

  return NextResponse.json({ ok: true, removed });
}
