'use client';

// CRM data layer — reads REAL leads from the private ops.leads table via the
// existing, auth-gated /api/operator/leads route (no new DB path, no static
// data). Lead shape mirrors the operator_list_leads RPC columns.

export type Lead = {
  id: number;
  business: string | null;
  owner: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  website: string | null;
  borough: string | null;
  category: string | null;
  source: string | null;
  stage: string | null;
  verify_status: string | null;
  scraped_at: string | null;
  contacted_at: string | null;
  replied_at: string | null;
  notes: string | null;
  reviews: number | null;
  created_at: string | null;
};

export type LeadsResponse = {
  leads: Lead[];
  counts: { total: number; by_stage: Record<string, number> };
};

async function req<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
  if (r.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('unauthenticated');
  }
  const data = (await r.json()) as T & { error?: string };
  if (!r.ok || (data as { error?: string })?.error) {
    throw new Error((data as { error?: string })?.error || `request failed (${r.status})`);
  }
  return data as T;
}

export const crmApi = {
  leads: (params?: { stage?: string; source?: string; q?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.stage) sp.set('stage', params.stage);
    if (params?.source) sp.set('source', params.source);
    if (params?.q) sp.set('q', params.q);
    sp.set('limit', String(params?.limit ?? 500));
    return req<LeadsResponse>(`/api/operator/leads?${sp.toString()}`);
  },
};

// ── helpers shared by CRM views ────────────────────────────────────────────
export function leadName(l: Lead): string {
  return l.business?.trim() || l.owner?.trim() || l.instagram?.replace(/^@/, '') || `Lead #${l.id}`;
}

export function leadHandle(l: Lead): string | null {
  if (!l.instagram) return null;
  return l.instagram.startsWith('@') ? l.instagram : `@${l.instagram}`;
}

// Zinga-voice template DM derived from real lead fields (matches the email
// draft voice). Placeholder until the OpenAI Responses API is wired —
// see docs/outreach-crm-plan.md. Deterministic, no invented numbers.
export function draftDm(l: Lead): string {
  const name = leadName(l);
  const cat = (l.category || '').toLowerCase();
  const noun = cat.includes('barber')
    ? 'barbershops'
    : cat.includes('hair') || cat.includes('salon') || cat.includes('beauty')
      ? 'salons'
      : cat.includes('nail')
        ? 'nail studios'
        : cat.includes('photo')
          ? 'photographers'
          : cat.includes('massage') || cat.includes('spa')
            ? 'spas'
            : 'local businesses';
  const where = l.borough ? ` in ${l.borough}` : '';
  return (
    `Hey! Came across ${name}${where} and really love your work. ` +
    `We help ${noun} fill mid-week gaps and take bookings directly through Zinga — ` +
    `no cost to be listed. Open to a quick 2-min look?`
  );
}
