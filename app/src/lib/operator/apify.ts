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

// Drop obviously-out-of-market profiles by bio (matches app.py _DROP_RE).
const DROP_RE =
  /(london|uk|toronto|canada|dubai|paris|seoul|korea|sydney|berlin|mumbai|india|lagos|madrid|milan)/i;

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

export async function apifyStatus(runId: string): Promise<{ status?: string; error?: string }> {
  if (!token()) return { error: 'APIFY_TOKEN not set' };
  if (!runId) return { error: 'missing runId' };
  const url = `https://api.apify.com/v2/actor-runs/${encodeURIComponent(runId)}?token=${token()}`;
  try {
    const resp = (await apifyReq('GET', url)) as { data?: { status?: string } };
    return { status: resp.data?.status };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Apify status failed' };
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
