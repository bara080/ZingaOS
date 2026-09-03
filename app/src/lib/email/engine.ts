// Durable relational EMAIL CAMPAIGN ENGINE — single-tenant port of lagosMailer's
// src/engine.js, adapted to Zinga's PRIVATE `ops` schema. Because ops.* tables
// are NOT exposed to PostgREST, every DB touch goes through a SECURITY DEFINER
// RPC in `public` (see tools/sql/email_engine.sql) called with the service-role
// client — never `.from('ops.*')`. The send loop (SMTP) stays here in Node.
//
// A run's recipient snapshot (ops.email_recipients) is the durable source of
// truth; UNIQUE(run_id, normalized_email) is the per-run dedup Set. The engine is
// idempotent and safe to call repeatedly — drainRun advances ONE chunk per call.
import { createServiceClient } from '@/lib/supabase/admin';
import { ENGINE, quotaDate } from './config';
import { sendViaProvider, PROVIDER } from './providers';

type Admin = ReturnType<typeof createServiceClient>;

const norm = (e: unknown) => String(e || '').trim().toLowerCase();

// Small typed rpc wrapper that throws with context (mirrors lagos error style).
async function rpc<T = unknown>(
  admin: Admin,
  fn: string,
  args: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await admin.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}

// ── Template rendering + CAN-SPAM footer ────────────────────────────────────
// Mustache-lite: {{key}} / {key} filled from a recipient's personalization.
function render(tpl: string | null | undefined, vars: Record<string, string>): string {
  if (!tpl) return '';
  return tpl.replace(/\{\{?\s*(\w+)\s*\}?\}/g, (m, key: string) => {
    const v = vars[key.toLowerCase()];
    return v != null && v !== '' ? v : '';
  });
}

// CAN-SPAM / unsubscribe footer appended to every campaign send (smtp.ts's
// sendEmail does NOT auto-add one; buildOutreachMessage's footer is mirrored
// here). CAN_SPAM_ADDRESS supplies the required physical mailing address.
function footers(): { text: string; html: string } {
  const addr = process.env.CAN_SPAM_ADDRESS || '';
  const line = `Reply "unsubscribe" if not relevant. Zinga${addr ? ` · ${addr}` : ''}`;
  return {
    text: `\n\n${line}`,
    html: `<p style="color:#888;font-size:12px;margin-top:16px">${line}</p>`,
  };
}

// ── Audit events ────────────────────────────────────────────────────────────
export async function logEvent(
  admin: Admin,
  runId: string,
  eventType: string,
  data: Record<string, unknown> = {},
  actor = 'workflow',
  stage: number | null = null,
): Promise<void> {
  await rpc(admin, 'email_event_log', {
    p_run_id: runId,
    p_stage: stage,
    p_type: eventType,
    p_data: data,
    p_actor: actor,
  });
}

// ── Campaign + version ──────────────────────────────────────────────────────
export type Campaign = {
  id: string;
  name: string;
  status: string;
  current_version_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function createCampaign(
  admin: Admin,
  opts: { name?: string; createdBy?: string } = {},
): Promise<Campaign> {
  return rpc<Campaign>(admin, 'email_campaign_create', {
    p_name: opts.name || 'Untitled campaign',
    p_created_by: opts.createdBy || null,
  });
}

export async function addVersion(
  admin: Admin,
  campaignId: string,
  v: {
    subject?: string;
    html?: string;
    text?: string;
    senderKey?: string;
    replyTo?: string;
    personalization?: Record<string, unknown>;
  } = {},
): Promise<{ id: string; version: number }> {
  return rpc(admin, 'email_campaign_add_version', {
    p_campaign_id: campaignId,
    p_subject: v.subject || '',
    p_html: v.html || '',
    p_text: v.text || '',
    p_sender_key: v.senderKey || '',
    p_reply_to: v.replyTo || null,
    p_personalization: v.personalization || {},
  });
}

export async function listCampaigns(admin: Admin): Promise<Campaign[]> {
  return (await rpc<Campaign[]>(admin, 'email_campaigns_list', {})) || [];
}

export async function getCampaign(admin: Admin, campaignId: string): Promise<Campaign | null> {
  return (await rpc<Campaign | null>(admin, 'email_campaign_get', { p_id: campaignId })) || null;
}

// ── Runs ────────────────────────────────────────────────────────────────────
export type Run = {
  id: string;
  campaign_id: string;
  campaign_version_id: string;
  status: string;
  audience_mode: string;
  audience_filter: Record<string, unknown>;
  source_run_id: string | null;
  duplicate_policy: string;
  stage_plan: Array<{ limit?: number; label?: string; gate?: string }>;
  current_stage: number;
  dispatch_chunk_size: number;
  audience_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export async function createRun(
  admin: Admin,
  r: {
    campaignId: string;
    versionId: string;
    audienceMode?: string;
    audienceFilter?: Record<string, unknown>;
    sourceRunId?: string | null;
    duplicatePolicy?: string;
    stagePlan?: unknown[];
    dispatchChunkSize?: number;
    priority?: number;
    createdBy?: string;
  },
): Promise<Run> {
  const run = await rpc<Run>(admin, 'email_run_create', {
    p_campaign_id: r.campaignId,
    p_version_id: r.versionId,
    p_audience_mode: r.audienceMode || 'all',
    p_audience_filter: r.audienceFilter || {},
    p_source_run_id: r.sourceRunId || null,
    p_duplicate_policy: r.duplicatePolicy || 'exclude_in_run',
    p_stage_plan: r.stagePlan || [],
    p_dispatch_chunk_size: r.dispatchChunkSize || ENGINE.defaultChunkSize,
    p_priority: r.priority ?? 100,
    p_created_by: r.createdBy || null,
  });
  await logEvent(admin, run.id, 'run.created', {
    audience_mode: run.audience_mode,
    duplicate_policy: run.duplicate_policy,
  });
  return run;
}

export async function getRun(admin: Admin, runId: string): Promise<Run | null> {
  return (await rpc<Run | null>(admin, 'email_run_get', { p_run_id: runId })) || null;
}

export async function setRunStatus(
  admin: Admin,
  runId: string,
  status: string,
  patch: Record<string, unknown> = {},
): Promise<void> {
  await rpc(admin, 'email_run_set_status', { p_run_id: runId, p_status: status, p_patch: patch });
}

type Counts = {
  run_id?: string;
  total: number;
  accepted: number;
  failed: number;
  pending: number;
  suppressed: number;
};

// List a campaign's runs (newest first) each with a compact progress rollup.
export async function listRuns(admin: Admin, campaignId: string): Promise<(Run & { progress: Counts })[]> {
  const runs = (await rpc<Run[]>(admin, 'email_runs_list', { p_campaign_id: campaignId })) || [];
  const counts = (await rpc<Counts[]>(admin, 'email_campaign_run_counts', { p_campaign_id: campaignId })) || [];
  const byRun = new Map(counts.map((c) => [c.run_id, c]));
  return runs.map((r) => {
    const c = byRun.get(r.id);
    return {
      ...r,
      progress: {
        total: Number(c?.total || 0),
        accepted: Number(c?.accepted || 0),
        failed: Number(c?.failed || 0),
        pending: Number(c?.pending || 0),
        suppressed: Number(c?.suppressed || 0),
      },
    };
  });
}

// Run + live progress + cadence stages + recent audit events (the monitor view).
export async function getRunDetail(admin: Admin, runId: string, eventLimit = 30) {
  const run = await getRun(admin, runId);
  if (!run) return null;
  const progress = await rpc<Record<string, number>>(admin, 'email_run_progress', { p_run_id: runId });
  const events = (await rpc<unknown[]>(admin, 'email_events_list', { p_run_id: runId, p_limit: eventLimit })) || [];
  const stageRows =
    (await rpc<
      { stage_number: number; total: number; accepted: number; failed: number; pending: number; suppressed: number }[]
    >(admin, 'email_run_stage_counts', { p_run_id: runId })) || [];

  const plan = Array.isArray(run.stage_plan) ? run.stage_plan : [];
  const cur = run.current_stage || 1;
  const running = run.status === 'running';
  const stages = stageRows.map((s) => {
    const n = s.stage_number;
    const pending = Number(s.pending);
    const label = plan[n - 1]?.label || (n > plan.length && plan.length ? 'Full remainder' : `Stage ${n}`);
    const status =
      pending === 0 ? 'complete' : n < cur ? 'complete' : n === cur ? (running ? 'running' : 'ready') : 'waiting';
    return {
      stage: n,
      label,
      total: Number(s.total),
      accepted: Number(s.accepted),
      failed: Number(s.failed),
      pending,
      suppressed: Number(s.suppressed),
      status,
    };
  });
  return { run, progress, events, stages };
}

// Paginated recipients (Recipients tab). Optional status filter.
export async function listRecipients(
  admin: Admin,
  runId: string,
  opts: { page?: number; limit?: number; status?: string } = {},
) {
  return rpc(admin, 'email_recipients_list', {
    p_run_id: runId,
    p_status: opts.status || null,
    p_page: opts.page || 1,
    p_limit: opts.limit || 50,
  });
}

// ── Audience snapshot (freeze the recipient list) ───────────────────────────
// Resolves the run's audience ONCE (server-side, in the RPC — excludes
// suppression + prior successes), then assigns cadence stages and queues the run.
export async function snapshotAudience(admin: Admin, runId: string): Promise<{ count: number }> {
  const run = await getRun(admin, runId);
  if (!run) throw new Error(`snapshot: run ${runId} not found`);

  const { count } = await rpc<{ count: number }>(admin, 'email_snapshot_audience', {
    p_run_id: runId,
    p_limit: null,
  });

  // Cadence: assign recipients to stages by the run's stage_plan limits (Test →
  // Canary → Ramp → remainder). No limits ⇒ everyone stays stage 1.
  const limits = (Array.isArray(run.stage_plan) ? run.stage_plan : [])
    .map((s) => Number(s.limit))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (limits.length) await rpc(admin, 'email_assign_stages', { p_run_id: runId, p_limits: limits });

  await setRunStatus(admin, runId, 'queued', { audience_count: count });
  await logEvent(admin, runId, 'audience.snapshotted', { count, mode: run.audience_mode });
  return { count };
}

// ── Quota (atomic, shared per day) ──────────────────────────────────────────
async function reserveQuota(admin: Admin, want: number): Promise<number> {
  return (
    (await rpc<number>(admin, 'email_reserve_quota', {
      p_channel: ENGINE.channel,
      p_date: quotaDate(),
      p_want: want,
      p_limit: ENGINE.dailyCap,
    })) ?? 0
  );
}
async function releaseQuota(admin: Admin, n: number): Promise<void> {
  if (!n) return;
  await rpc(admin, 'email_release_quota', { p_channel: ENGINE.channel, p_date: quotaDate(), p_n: n });
}
async function commitQuota(admin: Admin, n: number): Promise<void> {
  if (!n) return;
  await rpc(admin, 'email_commit_quota', { p_channel: ENGINE.channel, p_date: quotaDate(), p_n: n });
}
async function reconcileQuota(admin: Admin): Promise<void> {
  await rpc(admin, 'email_reconcile_quota', {
    p_channel: ENGINE.channel,
    p_date: quotaDate(),
    p_limit: ENGINE.dailyCap,
  });
}

type ClaimedRecipient = {
  id: string;
  normalized_email: string;
  lead_id: number | null;
  personalization: Record<string, string> | null;
  attempt_count: number;
};

type Version = {
  subject: string;
  html_body: string;
  text_body: string;
  reply_to: string | null;
};

export type DrainOutcome = {
  done?: boolean;
  paused?: boolean;
  gated?: boolean;
  stopped?: boolean;
  advanced?: boolean;
  capReached?: boolean;
  health?: boolean;
  sentNow?: number;
};

// ── Drain one chunk (the unit a workflow/cron repeats) ──────────────────────
// Advances the run by ONE chunk. Reserves quota atomically, claims pending
// recipients of the current stage, sends them via SMTP, records results, handles
// cadence stage advance + the auto health-gate. Returns a small outcome object.
export async function drainChunk(admin: Admin, runId: string): Promise<DrainOutcome> {
  const run = await getRun(admin, runId);
  if (!run) return { stopped: true };
  if (run.status === 'paused') return { paused: true };
  if (run.status === 'gated') return { gated: true };
  if (run.status === 'stopping' || run.status === 'stopped') {
    await cancelPending(admin, runId);
    await setRunStatus(admin, runId, 'stopped', { completed_at: new Date().toISOString() });
    return { stopped: true };
  }

  // Self-heal: reclaim orphaned 'sending' rows from a previously interrupted drain
  // and resync the quota bucket so leaked reservations can't stall the run.
  const reclaimed = await rpc<number>(admin, 'email_reset_orphans', { p_run_id: runId });
  if (reclaimed && reclaimed > 0) {
    await reconcileQuota(admin);
    await logEvent(admin, runId, 'claims.reclaimed', { count: reclaimed });
  }

  // Cadence gating: only the CURRENT stage sends. When it drains, advance (or
  // finish). Stage size is enforced by recipients' assigned stage_number.
  const cur = run.current_stage || 1;
  const { pending_stage: pendingStage, ahead } = await rpc<{ pending_stage: number; ahead: number }>(
    admin,
    'email_stage_pending',
    { p_run_id: runId, p_stage: cur },
  );

  if (!Number(pendingStage)) {
    if (Number(ahead)) {
      await logEvent(admin, runId, 'stage.completed', { stage: cur }, 'workflow', cur);

      // Auto health-gate: HOLD if the just-completed stage's fail+bounce rate is
      // too high, so a bad batch can't ramp to the next (larger) stage.
      const h = await rpc<{ total: number; failed: number; bounced: number }>(admin, 'email_stage_health', {
        p_run_id: runId,
        p_stage: cur,
      });
      const stTot = Number(h.total || 0);
      const bad = Number(h.failed || 0) + Number(h.bounced || 0);
      const rate = stTot ? bad / stTot : 0;
      if (stTot >= ENGINE.healthMinSample && rate > ENGINE.healthMaxFailRate) {
        await setRunStatus(admin, runId, 'gated');
        await logEvent(admin, runId, 'stage.health_gated', {
          stage: cur,
          total: stTot,
          failed: Number(h.failed || 0),
          bounced: Number(h.bounced || 0),
          rate: Math.round(rate * 1000) / 10,
          threshold: Math.round(ENGINE.healthMaxFailRate * 100),
        }, 'workflow', cur);
        return { gated: true, health: true };
      }

      // Gate: if the NEXT stage requires approval, HOLD until the operator
      // continues. plan[cur] is stage cur+1 (0-indexed).
      const plan = Array.isArray(run.stage_plan) ? run.stage_plan : [];
      if (plan[cur]?.gate === 'manual') {
        await setRunStatus(admin, runId, 'gated');
        await logEvent(admin, runId, 'stage.gated', { completed: cur, next: cur + 1 }, 'workflow', cur);
        return { gated: true };
      }
      await setRunStatus(admin, runId, 'running', { current_stage: cur + 1 });
      await logEvent(admin, runId, 'stage.started', { stage: cur + 1 }, 'workflow', cur + 1);
      return { advanced: true, sentNow: 0 };
    }
    return { done: true };
  }

  // Reserve daily-cap capacity for this chunk.
  const want = Math.min(run.dispatch_chunk_size || ENGINE.defaultChunkSize, Number(pendingStage));
  const grant = await reserveQuota(admin, want);
  if (grant <= 0) {
    await logEvent(admin, runId, 'quota.waiting', { want });
    return { capReached: true };
  }

  // Atomically claim `grant` pending recipients of the current stage.
  const batch =
    (await rpc<ClaimedRecipient[]>(admin, 'email_claim_batch', {
      p_run_id: runId,
      p_stage: cur,
      p_limit: grant,
    })) || [];
  if (!batch.length) {
    await releaseQuota(admin, grant);
    return { done: true };
  }

  // Content from the frozen version.
  const version = await rpc<Version>(admin, 'email_version_get', { p_version_id: run.campaign_version_id });
  const foot = footers();

  let accepted = 0;
  const contactedLeadIds: number[] = [];
  let lastSubject = '';
  for (const rcp of batch) {
    const vars: Record<string, string> = {
      name: rcp.personalization?.name || '',
      business: rcp.personalization?.business || '',
      category: rcp.personalization?.category || '',
      email: rcp.normalized_email,
    };
    const subject = render(version.subject, vars) || 'Message';
    lastSubject = subject;
    const text = version.text_body ? render(version.text_body, vars) + foot.text : `${subject}${foot.text}`;
    const html = version.html_body ? render(version.html_body, vars) + foot.html : undefined;
    try {
      const res = await sendViaProvider({ to: rcp.normalized_email, subject, text, html });
      await rpc(admin, 'email_recipient_mark', {
        p_id: rcp.id,
        p_status: 'accepted',
        p_provider: PROVIDER,
        p_message_id: res.messageId,
        p_error: null,
      });
      if (rcp.lead_id) contactedLeadIds.push(Number(rcp.lead_id));
      accepted++;
    } catch (e) {
      await rpc(admin, 'email_recipient_mark', {
        p_id: rcp.id,
        p_status: 'failed',
        p_provider: PROVIDER,
        p_message_id: null,
        p_error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Mark accepted leads contacted in ops.leads (reuse the existing CRM RPC).
  if (contactedLeadIds.length) {
    try {
      await admin.rpc('operator_mark_contacted', { p_ids: contactedLeadIds, p_subject: lastSubject });
    } catch {
      /* non-fatal: the send already succeeded */
    }
  }

  // Reconcile quota: keep `accepted`, return the rest.
  await commitQuota(admin, accepted);
  await releaseQuota(admin, grant - accepted);
  await logEvent(admin, runId, 'batch.sent', { accepted, attempted: batch.length }, 'workflow', cur);
  return { sentNow: accepted, done: false };
}

async function cancelPending(admin: Admin, runId: string): Promise<void> {
  // Cancels remaining pending via the claim path would be wrong; a dedicated
  // status flip keeps it simple. Reuse set-status semantics through a targeted
  // update RPC is unnecessary — pending rows are simply left and the run is
  // marked stopped. (Kept as a no-op hook for parity with lagos cancelPending;
  // Stage 1 leaves pending rows in place, they are excluded from active sends.)
  await logEvent(admin, runId, 'run.cancel_pending', {});
}

// ── Lifecycle ───────────────────────────────────────────────────────────────
export async function startRun(admin: Admin, runId: string): Promise<void> {
  const run = await getRun(admin, runId);
  const patch: Record<string, unknown> = { started_at: run?.started_at || new Date().toISOString() };
  if (!run?.current_stage) patch.current_stage = 1;
  await setRunStatus(admin, runId, 'running', patch);
  await logEvent(admin, runId, 'run.started', {});
}

export async function finishRun(admin: Admin, runId: string): Promise<void> {
  const progress = await rpc<Record<string, number>>(admin, 'email_run_progress', { p_run_id: runId });
  await setRunStatus(admin, runId, 'completed', { completed_at: new Date().toISOString() });
  await logEvent(admin, runId, 'run.completed', progress);
}

// Drain ONE chunk of a run, advancing lifecycle (queued→running, →completed).
// This is the entrypoint the local drain route calls (and a workflow/cron later).
export async function drainRun(admin: Admin, runId: string): Promise<DrainOutcome> {
  const run = await getRun(admin, runId);
  if (!run) return { stopped: true };
  if (run.status === 'queued') await startRun(admin, runId);
  const out = await drainChunk(admin, runId);
  if (out.done) await finishRun(admin, runId);
  return out;
}

// ── Control (pause / resume / stop / continue) ──────────────────────────────
const CONTROL_STATUS: Record<string, string> = { pause: 'paused', resume: 'running', stop: 'stopping' };

export async function controlRun(
  admin: Admin,
  runId: string,
  action: string,
): Promise<{ ok: boolean; status: string }> {
  // `continue` releases a gated run into its next cadence stage.
  if (action === 'continue') {
    const run = await getRun(admin, runId);
    const next = (run?.current_stage || 1) + 1;
    await setRunStatus(admin, runId, 'running', { current_stage: next });
    await logEvent(admin, runId, 'stage.started', { stage: next }, 'user', next);
    return { ok: true, status: 'running' };
  }
  const status = CONTROL_STATUS[action];
  if (!status) throw new Error(`unknown run action: ${action}`);
  await setRunStatus(admin, runId, status);
  await logEvent(admin, runId, `run.${action}`, {}, 'user');
  return { ok: true, status };
}

// Normalize an email the same way the snapshot does (exported for callers).
export { norm as normalizeEmail };
