import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { apifyItems, isScrapeSource } from '@/lib/operator/apify';

// GET /api/operator/scrape/results?dataset=...&source=ig|google|tiktok
// Auth-gated. Fetches + cleans the Apify dataset, UPSERTS the rows into the
// private ops.leads table (via the service-role SECURITY DEFINER RPC
// operator_upsert_leads, ON CONFLICT DO NOTHING), and returns the cleaned rows
// for the results table. The source tag is `apify-<source>` so the Email tab's
// data-source picker can target this batch. Every results fetch is audited.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const { searchParams } = new URL(req.url);
  const dataset = searchParams.get('dataset') ?? '';
  const source = searchParams.get('source');
  if (!isScrapeSource(source)) {
    return NextResponse.json({ error: 'unknown source' }, { status: 400 });
  }

  const result = await apifyItems(dataset, source);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 502 });

  const sourceTag = `apify-${source}`;
  const scrapedAt = new Date().toISOString().slice(0, 10);
  let inserted = 0;
  let dbError: string | null = null;

  if (result.items.length) {
    const payload = result.items.map((r) => ({
      business: r.business,
      owner: r.owner,
      email: r.email,
      phone: r.phone,
      instagram: r.instagram,
      website: r.website,
      borough: '',
      category: '',
      source: sourceTag,
      stage: 'scraped',
      scraped_at: scrapedAt,
      notes: r.notes,
    }));
    try {
      const admin = createServiceClient();
      const { data, error } = await admin.rpc('operator_upsert_leads', { p_leads: payload });
      if (error) dbError = error.message;
      else inserted = Number(data) || 0;
      await admin.rpc('operator_audit_insert', {
        p_actor: gate.session.email,
        p_action: 'scrape.results',
        p_detail: `${sourceTag} · found=${result.found} dropped=${result.dropped} inserted=${inserted}`,
      });
    } catch (e) {
      dbError = e instanceof Error ? e.message : 'upsert failed';
    }
  }

  return NextResponse.json({
    items: result.items,
    found: result.found,
    dropped: result.dropped,
    inserted,
    source,
    sourceTag,
    dbError,
  });
}
