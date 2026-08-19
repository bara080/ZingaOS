import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session/session';
import { createServiceClient } from '@/lib/supabase/admin';

// ⚠️ PII ENDPOINT — INTENTIONAL. This route returns lead emails / phones from the
// PRIVATE `ops.leads` table. That exposure is deliberate: the Operator console
// needs live contact data. It is protected TWICE:
//   1. This handler requires an authenticated session with role superadmin|admin.
//   2. `ops` is RLS deny-all and NOT exposed to PostgREST; the only way in is the
//      SECURITY DEFINER RPC `public.operator_list_leads` whose EXECUTE is granted
//      to service_role ONLY (revoked from public/anon/authenticated).
// The service-role key is server-only. Never call this data from the browser
// directly and never widen the RPC grant. See tools/sql/operator_leads.sql.

export const dynamic = 'force-dynamic';

const OPERATOR_ROLES = new Set(['superadmin', 'admin']);

export async function GET(req: Request) {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!OPERATOR_ROLES.has(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const stage = searchParams.get('stage')?.trim() || null;
    const source = searchParams.get('source')?.trim() || null;
    const q = searchParams.get('q')?.trim() || null;
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 500, 1), 2000);

    const admin = createServiceClient();

    // ops is a non-public schema not exposed to PostgREST, so we go through the
    // locked-down SECURITY DEFINER RPCs rather than `.schema('ops').from('leads')`.
    const [{ data: rows, error: rowsErr }, { data: countRows, error: countErr }] =
      await Promise.all([
        admin.rpc('operator_list_leads', {
          p_stage: stage,
          p_source: source,
          p_q: q,
          p_limit: limit,
        }),
        admin.rpc('operator_lead_counts'),
      ]);

    if (rowsErr || countErr) {
      console.error('operator/leads RPC error', rowsErr ?? countErr);
      return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 });
    }

    const by_stage: Record<string, number> = {};
    let total = 0;
    for (const c of countRows ?? []) {
      by_stage[c.stage] = Number(c.n);
      total += Number(c.n);
    }

    return NextResponse.json({
      leads: rows ?? [],
      counts: { total, by_stage },
    });
  } catch (err) {
    console.error('operator/leads error', err);
    return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 });
  }
}
