// Zinga OS entity graph — PII-free (structural labels only, no salon names/emails).
const COL = {
  core: '#EDF1F6', pillar: '#AEB7C3', agent: '#2FD9C9', skill: '#E6B24C',
  auto: '#5E9BE8', tool: '#8B96A6', data: '#4FD08A', human: '#E8925A', empty: '#E0655A'
};
const SIZE = { core: 26, pillar: 13, agent: 10, skill: 9, auto: 9, tool: 7, data: 9, human: 11 };
export const TYPE_LABEL = {
  pillar: 'Pillars', agent: 'AI agents', skill: 'Skills / SOPs',
  auto: 'Automations', tool: 'Tools', data: 'Data', human: 'Humans'
};
export const TYPE_COLOR = COL;

const N = [], E = [], byId = {};
const add = (id, label, type, status = 'ok', detail = '') => {
  const n = { id, label, type, status, detail }; N.push(n); byId[id] = n; return n;
};
const link = (a, b, kind = 'struct') => { if (byId[a] && byId[b]) E.push({ id: `${a}~${b}`, source: a, target: b, data: { kind } }); };

add('core', 'Zinga OS', 'core', 'ok', 'The operating system. A gbrain second brain at the center; Claude drives every agent. context/ read-only; data/ + runs/ writable; every send waits for approval.');

[['supply', 'Supply', 'Providers: source → contact → sign → list. The first goal number.'],
 ['trust', 'Trust', 'Every public claim traces to evidence. Zero placeholder testimonials.'],
 ['demand', 'Demand', 'Customers & bookings. Stays empty until supply is dense.'],
 ['marketing', 'Marketing', "Demand-side content in Zinga's voice. Draft-only, never posts."],
 ['automations', 'Automations', 'n8n + Apify. Trigger → call → log. No business logic in the canvas.'],
 ['knowledge', 'Knowledge', 'brain/ + gbrain — the second brain: people, companies, concepts.']
].forEach(([id, l, d]) => { add(id, l, 'pillar', 'ok', d); link(id, 'core', 'spine'); });

[['supply-scout', 'supply', null, 'Finds working solo pros, enriches brain/people, preps batches.'],
 ['sourcing-agent', 'automations', 'supply', 'Runs the Apify pipeline. API sourcing, not scraping. Produced the 1,962-row batch.'],
 ['crm-agent', 'supply', null, 'Dedupes providers.csv, advances stages from evidence, flags stalled.'],
 ['trust-keeper', 'trust', null, 'Audits every public claim on zingaapp.com against data/.'],
 ['marketing-agent', 'marketing', 'demand', 'Drafts social/landing/ad copy in voice. Never posts.'],
 ['developer-agent', 'automations', 'knowledge', 'Maintains tools/, n8n JSON, these visuals, data schemas.']
].forEach(([id, p, p2, d]) => { add(id, id, 'agent', 'ok', d); link(id, p, 'serves'); if (p2) link(id, p2, 'serves'); });

[['outreach-run', 'supply', 'draft', 'Drafts provider outreach from the pipeline. 47 drafts staged, 0 sent.'],
 ['testimonial-collect', 'trust', 'empty', 'Requests/records/verifies real testimonials. 0 on file.'],
 ['weekly-review', 'knowledge', 'ok', 'Friday pulse on the three numbers with evidence.'],
 ['deep-research', 'knowledge', 'ok', 'Fan-out web research, adversarial verify, cited report.']
].forEach(([id, p, st, d]) => { add(id, id, 'skill', st, d); link(id, p, 'runs'); });

[['weekly-prospect-pull', 'automations', 'ok', 'Mon 06:00 → sourcing-agent via Apify. Pipeline front-end (the one that works).'],
 ['nightly-outreach', 'supply', 'empty', 'Mon 08:00 → /outreach-run. Paused until proven by hand.'],
 ['day4-followup', 'supply', 'empty', 'Tue–Sat 09:00 → crm-agent + follow-up drafts.'],
 ['provider-signup', 'supply', 'empty', 'Webhook from zingaapp.com → crm-agent reconcile.'],
 ['testimonial-chase', 'trust', 'empty', 'Job done +48h → /testimonial-collect draft.'],
 ['metrics-sync', 'knowledge', 'empty', 'Sun 22:00 → recompute weekly.csv.'],
 ['review-cron', 'knowledge', 'empty', 'Fri 17:00 → /weekly-review pulse.'],
 ['social-post', 'marketing', 'empty', 'Mon/Wed/Fri 10:00 → marketing-agent drafts FB + IG.'],
 ['whatsapp-inbound', 'marketing', 'empty', 'WhatsApp reply → crm-agent triage.']
].forEach(([id, p, st, d]) => { add(id, id === 'review-cron' ? 'weekly-review·cron' : id, 'auto', st, d); link(id, p, 'cron'); });

[['apify', 'automations', 'ok', 'GMaps / Email Extractor / IG actors. Pay-as-you-go, already running.'],
 ['run_actor.py', 'automations', 'ok', 'Manual Apify runner. Multi-city backfills.'],
 ['outreach_mailer.py', 'supply', 'ok', 'Email; sends only with --send. 0 real sends.'],
 ['social_publish.py', 'marketing', 'ok', 'FB Page + IG publish; --publish gated. 0 posts.'],
 ['whatsapp_send.py', 'marketing', 'ok', 'WhatsApp Cloud API; opt-in + template gated. 0 sent.'],
 ['figma', 'marketing', 'ok', 'Post-graphic source via Figma MCP → Vercel assets.'],
 ['meta-graph', 'marketing', 'ok', 'Meta Graph API: Facebook, Instagram, WhatsApp.'],
 ['gbrain', 'knowledge', 'ok', 'recall / remember / entity / synthesize over brain/.'],
 ['hubspot', 'supply', 'ok', 'CRM upsert target in the campaign pipeline.'],
 ['claude-api', 'core', 'ok', 'Drives every agent and personalization step.'],
 ['slack', 'automations', 'ok', 'Every automated run ends in a Slack ping to Bara.']
].forEach(([id, p, st, d]) => { add(id, id, 'tool', st, d); link(id, p, 'uses'); });

[['providers.csv', 'supply', 498, 'live', '498 Brooklyn salons loaded · 227 ICP-pass · stage=prospect.'],
 ['outreach.csv', 'supply', 0, 'empty', '0 sends logged. 47 drafts waiting for approval.'],
 ['weekly.csv', 'knowledge', 0, 'empty', '0 metric rows. Fills on the first weekly-review.'],
 ['testimonials', 'trust', 0, 'empty', '0 permissioned quotes. Site claims un-audited.'],
 ['brain/people', 'knowledge', 1, 'live', 'Provider knowledge pages — mostly still to be written.']
].forEach(([id, p, v, st, d]) => { const n = add(id, id, 'data', st, d); n.val = v; link(id, p, 'writes'); });

add('bara', 'Bara', 'human', 'ok', 'Founder. Approves every send. Owns context/. The only human in the loop.');
link('bara', 'core', 'owns');

[['nightly-outreach', 'outreach-run'], ['testimonial-chase', 'testimonial-collect'],
 ['outreach-run', 'outreach_mailer.py'], ['outreach-run', 'providers.csv'],
 ['outreach_mailer.py', 'outreach.csv'], ['sourcing-agent', 'apify'], ['run_actor.py', 'apify'],
 ['weekly-prospect-pull', 'apify'], ['weekly-prospect-pull', 'sourcing-agent'], ['crm-agent', 'providers.csv'],
 ['metrics-sync', 'weekly.csv'], ['review-cron', 'weekly-review'], ['weekly-review', 'weekly.csv'],
 ['testimonial-collect', 'testimonials'], ['trust-keeper', 'testimonials'], ['gbrain', 'brain/people'],
 ['provider-signup', 'crm-agent'], ['claude-api', 'core'], ['sourcing-agent', 'providers.csv'],
 ['day4-followup', 'outreach-run'], ['day4-followup', 'crm-agent'],
 ['social-post', 'marketing-agent'], ['social-post', 'social_publish.py'], ['social_publish.py', 'meta-graph'],
 ['whatsapp-inbound', 'crm-agent'], ['whatsapp-inbound', 'whatsapp_send.py'], ['whatsapp_send.py', 'meta-graph'],
 ['marketing-agent', 'figma'], ['marketing-agent', 'social_publish.py'], ['figma', 'meta-graph']
].forEach(([a, b]) => link(a, b, 'call'));

export const nodes = N.map(n => ({
  id: n.id,
  label: n.label,
  fill: n.status === 'empty' ? COL.empty : COL[n.type],
  size: SIZE[n.type] || 7,
  data: { type: n.type, status: n.status, detail: n.detail, val: n.val }
}));
export const edges = E;
export const NODE_INDEX = Object.fromEntries(N.map(n => [n.id, n]));
export const COUNTS = N.reduce((a, n) => { a[n.type] = (a[n.type] || 0) + 1; return a; }, {});
export const EMPTIES = N.reduce((a, n) => { if (n.status === 'empty') a[n.type] = (a[n.type] || 0) + 1; return a; }, {});
