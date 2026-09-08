// Apify scrape layer for the Operator console. Ported from tools/operator/app.py
// (the apify_* functions) + tools/apify_ig_scrape.py input shape. Runs entirely
// server-side; APIFY_TOKEN never reaches the browser. Serverless-safe: start()
// returns a runId, the browser polls status(), then fetches results() — all short
// HTTP calls, no long-lived actor waits.

export const SCRAPE_NUMBER_MAX = 200; // hard cap, enforced here (not just in UI)

const ACTORS: Record<string, string> = {
  ig: 'apify~instagram-scraper',
  google: 'compass~crawler-google-places',
  tiktok: 'clockworks~tiktok-scraper',
};

// Drop obviously-out-of-market (non-USA) profiles by bio. Zinga is USA-only, so
// a bio naming a foreign city/country is a strong out-of-market signal. Word
// boundaries (\b) avoid false hits like "uk" inside "makeup". This is a backstop —
// the primary guardrail is requiring a USA location in the query (empty → the UI
// prompts, defaulting to "USA").
const DROP_TERMS = [
  // UK / Ireland
  'london', 'uk', 'united kingdom', 'england', 'manchester', 'birmingham',
  'scotland', 'edinburgh', 'glasgow', 'wales', 'ireland', 'dublin',
  // Europe
  'paris', 'france', 'berlin', 'germany', 'deutschland', 'madrid', 'spain',
  'espana', 'barcelona', 'milan', 'milano', 'italy', 'italia', 'rome', 'roma',
  'lisbon', 'portugal', 'amsterdam', 'netherlands', 'brussels', 'belgium',
  'zurich', 'switzerland', 'vienna', 'austria', 'stockholm', 'sweden', 'oslo',
  'norway', 'copenhagen', 'denmark', 'helsinki', 'finland', 'athens', 'greece',
  'warsaw', 'poland', 'moscow', 'russia', 'ukraine', 'istanbul', 'turkey', 'turkiye',
  // Middle East / Africa
  'dubai', 'abu dhabi', 'uae', 'riyadh', 'jeddah', 'saudi', 'doha', 'qatar',
  'kuwait', 'bahrain', 'oman', 'cairo', 'egypt', 'morocco', 'lagos', 'nigeria',
  'nairobi', 'kenya', 'accra', 'ghana', 'johannesburg', 'cape town', 'south africa',
  // Asia / Oceania
  'mumbai', 'delhi', 'india', 'bangalore', 'karachi', 'lahore', 'pakistan',
  'dhaka', 'bangladesh', 'colombo', 'kathmandu', 'seoul', 'korea', 'tokyo',
  'osaka', 'japan', 'beijing', 'shanghai', 'china', 'hong kong', 'taipei', 'taiwan',
  'bangkok', 'thailand', 'jakarta', 'bali', 'indonesia', 'kuala lumpur', 'malaysia',
  'singapore', 'manila', 'philippines', 'hanoi', 'vietnam', 'sydney', 'melbourne',
  'brisbane', 'perth', 'australia', 'auckland', 'new zealand',
  // North America (non-US)
  'toronto', 'vancouver', 'montreal', 'canada', 'mexico', 'mexico city',
  // South America
  'brazil', 'brasil', 'sao paulo', 'rio de janeiro', 'bogota', 'colombia',
  'buenos aires', 'argentina', 'santiago', 'chile', 'lima', 'peru',
];
const DROP_RE = new RegExp('\\b(' + DROP_TERMS.join('|') + ')\\b', 'i');

// ── Category-relevance / junk filter (ingest gate) ──────────────────────────
// Broad IG searches like "nail technicians NY USA" drag in brands (bmwusa),
// media (usatoday), gov (nypd), sports (nba), adult/dating, and generic "usa*"
// accounts. We drop those AT INGEST so junk never reaches the queue. Ported from
// the proven lead-cleanup sweeps (zero false positives on real data).
//
// A lead matching SERVICE_RE (any of Zinga's 5 verticals) is ALWAYS kept, even if
// the handle looks generic. Only when there is NO service signal do we drop leads
// whose handle+bio matches a known junk shape. This can never drop a real provider
// who names their trade — it only removes accounts that are clearly not providers.
// A provider signal in any of Zinga's 5 verticals — always kept (unless adult).
const SERVICE_RE =
  /(barber|barbear|salon|hair|nails?|manicure|pedicure|\bspa\b|groom|\bcut|\bfade|braid|\blocs?\b|lash|\bbrows?\b|makeup|make[-\s]?up|\bwax|thread|photo|foto|videograph|studio|massage|therap|\bauto\b|detail|estetic|esthetic|\bglam|stylist|beleza|corte|shave|tattoo|\bpmu\b|microblad|facial|skincare|beaut)/i;
// Adult/dating — dropped even when a service-ish word appears (e.g. "beautiful girls").
const ADULT_RE =
  /(beautiful[_.]?girls?|hot[_.]?girls?|_girls?\d|\bgirls?\b\s*\d|dating|\bsingles\b|escort|onlyfans|\bmilf\b|sugar_?(baby|daddy)|\bmodels?\b)/i;
// Non-provider entities: brands, media, gov, sports, finance, NGOs.
const ENTITY_RE =
  /(\bnba\b|\bnfl\b|\bnhl\b|basketball|\bnews\b|network|magazine|\btv\b|podcast|\bgov\b|nypd|fdny|\bmayor\b|governor|senate|congress|\belection|unicef|turningpoint|numbersusa|rescue|\bdogs?\b|\bpets?\b|shelter|army\b|\bnavy\b|marines|\bmilitary\b|airforce|crypto|forex|\bnft\b|realtor|lottery|\bbmw|\baudi|toyota|honda|mercedes|\bbenz\b|samsung|verizon|walmart|costco|nasdaq|\bnyse\b|usatoday|usanetwork|\bcanon)/i;
// Generic "usa*" handles (from broad "…USA" searches) — checked on the HANDLE only,
// so a real US provider whose BIO says "USA" is never dropped.
const GENERIC_USA_RE = /(^usa($|[^a-z])|^usa[_.]|[_.]usa($|[_.\d])|_usa_|theusa|visittheusa|usa\d)/i;

// true → this scraped account is not a service provider; drop it at ingest.
// Order matters: adult overrides a service keyword; a real service signal keeps the
// lead; otherwise known non-provider shapes (entities / generic-usa handles) drop.
export function isJunkLead(handle: string, bio: string): boolean {
  const h = handle.toLowerCase();
  const t = `${handle} ${bio}`.toLowerCase();
  if (ADULT_RE.test(t)) return true;
  if (SERVICE_RE.test(t)) return false;
  if (ENTITY_RE.test(t)) return true;
  if (GENERIC_USA_RE.test(h)) return true;
  return false;
}

export type ScrapeSource = 'ig' | 'google' | 'tiktok';

export function isScrapeSource(s: unknown): s is ScrapeSource {
  return s === 'ig' || s === 'google' || s === 'tiktok';
}

export function clampNumber(n: unknown): number {
  const v = Math.floor(Number(n) || 20);
  return Math.max(1, Math.min(SCRAPE_NUMBER_MAX, v));
}

function token(): string {
  return process.env.APIFY_TOKEN ?? '';
}

function actorInput(source: ScrapeSource, query: string, number: number): Record<string, unknown> {
  if (source === 'ig') {
    // Proven shape from tools/apify_ig_scrape.py — `search` (NOT searchQuery),
    // resultsType=details expands profiles, searchLimit is the lead-count lever.
    return {
      search: query,
      searchType: 'user',
      searchLimit: number,
      resultsType: 'details',
      resultsLimit: number,
    };
  }
  if (source === 'google') {
    return {
      searchStringsArray: [query],
      maxCrawledPlacesPerSearch: number,
      language: 'en',
    };
  }
  // tiktok
  return { searchQueries: [query], resultsPerPage: number };
}

async function apifyReq(method: string, url: string, body?: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Apify HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : {};
}

export type StartResult = { runId: string; datasetId: string } | { error: string };

export async function apifyStart(
  source: ScrapeSource,
  query: string,
  number: number,
): Promise<StartResult> {
  if (!token()) return { error: 'APIFY_TOKEN not set (add it to the server env)' };
  if (!query.trim()) return { error: 'query is empty' };
  const actor = ACTORS[source];
  const url = `https://api.apify.com/v2/acts/${actor}/runs?token=${token()}`;
  try {
    const resp = (await apifyReq('POST', url, actorInput(source, query.trim(), number))) as {
      data?: { id?: string; defaultDatasetId?: string };
    };
    const d = resp.data ?? {};
    if (!d.id || !d.defaultDatasetId) return { error: 'Apify did not return a run id' };
    return { runId: d.id, datasetId: d.defaultDatasetId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Apify start failed' };
  }
}

export async function apifyStatus(
  runId: string,
): Promise<{ status?: string; durationMs?: number; error?: string }> {
  if (!token()) return { error: 'APIFY_TOKEN not set' };
  if (!runId) return { error: 'missing runId' };
  const url = `https://api.apify.com/v2/actor-runs/${encodeURIComponent(runId)}?token=${token()}`;
  try {
    const resp = (await apifyReq('GET', url)) as {
      data?: {
        status?: string;
        startedAt?: string;
        finishedAt?: string;
        stats?: { runTimeSecs?: number };
      };
    };
    const d = resp.data;
    // Real Apify runtime: prefer stats.runTimeSecs, else finishedAt - startedAt.
    let durationMs: number | undefined;
    if (typeof d?.stats?.runTimeSecs === 'number') {
      durationMs = Math.round(d.stats.runTimeSecs * 1000);
    } else if (d?.startedAt && d?.finishedAt) {
      const ms = new Date(d.finishedAt).getTime() - new Date(d.startedAt).getTime();
      if (Number.isFinite(ms) && ms >= 0) durationMs = ms;
    }
    return { status: d?.status, durationMs };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Apify status failed' };
  }
}

// Abort a running Apify actor run (Scrape History ⋮ → Pause). Best-effort.
export async function apifyAbort(runId: string): Promise<{ ok: boolean; error?: string }> {
  if (!token()) return { ok: false, error: 'APIFY_TOKEN not set' };
  if (!runId) return { ok: false, error: 'missing runId' };
  const url = `https://api.apify.com/v2/actor-runs/${encodeURIComponent(runId)}/abort?token=${token()}`;
  try {
    await apifyReq('POST', url);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Apify abort failed' };
  }
}

export type CleanRow = {
  business: string;
  owner: string;
  email: string;
  phone: string;
  instagram: string;
  website: string;
  notes: string;
};

export type ItemsResult =
  | { items: CleanRow[]; found: number; dropped: number; source: ScrapeSource }
  | { error: string };

// Fetch + clean dataset items into the ops.leads column shape. Social (ig/tiktok)
// map handle→instagram, profile url→website, bio→notes. Google maps name→business,
// plus email/phone/address(notes). Mirrors app.py apify_items cleaning.
export async function apifyItems(datasetId: string, source: ScrapeSource): Promise<ItemsResult> {
  if (!token()) return { error: 'APIFY_TOKEN not set' };
  if (!datasetId) return { error: 'missing datasetId' };
  const url =
    `https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items` +
    `?clean=true&format=json&token=${token()}`;
  let raw: unknown;
  try {
    raw = await apifyReq('GET', url);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Apify results failed' };
  }
  const arr: Record<string, unknown>[] = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  const rows: CleanRow[] = [];
  let dropped = 0;

  const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v));

  if (source === 'ig' || source === 'tiktok') {
    for (const it of arr) {
      let uname = str(it.username) || str(it.uniqueId);
      if (!uname && it.authorMeta && typeof it.authorMeta === 'object') {
        uname = str((it.authorMeta as Record<string, unknown>).name);
      }
      if (!uname) {
        dropped++;
        continue;
      }
      const bio = str(it.biography) || str(it.signature);
      if (bio && DROP_RE.test(bio)) {
        dropped++;
        continue;
      }
      // Category-relevance gate: drop non-provider junk (brands, media, gov,
      // sports, adult, generic "usa*") before it ever reaches the queue.
      if (isJunkLead(uname, bio)) {
        dropped++;
        continue;
      }
      const link =
        str(it.url) ||
        (source === 'ig' ? `https://instagram.com/${uname}` : `https://tiktok.com/@${uname}`);
      rows.push({
        business: uname,
        owner: '',
        email: '',
        phone: '',
        instagram: uname,
        website: link,
        notes: bio.slice(0, 280),
      });
    }
  } else {
    // google
    for (const it of arr) {
      const name = str(it.title) || str(it.name);
      if (!name) {
        dropped++;
        continue;
      }
      let email = str(it.email);
      if (!email && Array.isArray(it.emails) && it.emails.length) email = str(it.emails[0]);
      rows.push({
        business: name,
        owner: '',
        email,
        phone: str(it.phone) || str(it.phoneUnformatted),
        instagram: '',
        website: str(it.website),
        notes: str(it.address),
      });
    }
  }
  return { items: rows, found: rows.length, dropped, source };
}
