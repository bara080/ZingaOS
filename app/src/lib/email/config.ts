// Central, env-overridable config for the email campaign engine. Ported from
// lagosMailer's engine-config.js — no magic numbers scattered through the code.
function toInt(v: string | undefined, d: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : d;
}
function toFloat(v: string | undefined, d: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
}

export const ENGINE = {
  channel: process.env.EMAIL_ENGINE_CHANNEL || 'email',
  // Quota day boundary (operator's timezone). America/New_York per spec.
  timezone: process.env.EMAIL_ENGINE_QUOTA_TZ || 'America/New_York',
  // Shared daily send cap (the atomic quota bucket's limit). lagos derived this
  // per-company from a store; single-tenant zinga uses a config default.
  dailyCap: toInt(process.env.EMAIL_ENGINE_DAILY_CAP, 500),
  // Recipients dispatched per drain chunk (a run may override via dispatch_chunk_size).
  defaultChunkSize: toInt(process.env.EMAIL_ENGINE_CHUNK_SIZE, 50),
  // Auto health-gate: when a cadence stage completes, HOLD the run (status
  // `gated`) if its fail+bounce rate exceeds this, so a bad batch can't ramp.
  healthMinSample: toInt(process.env.EMAIL_ENGINE_HEALTH_MIN_SAMPLE, 20),
  healthMaxFailRate: toFloat(process.env.EMAIL_ENGINE_HEALTH_MAX_FAIL_RATE, 0.15),
} as const;

// Quota day boundary as a YYYY-MM-DD string in the engine timezone.
export function quotaDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: ENGINE.timezone });
}
