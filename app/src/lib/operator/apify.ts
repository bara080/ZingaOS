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
