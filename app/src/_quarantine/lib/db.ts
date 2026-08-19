import { MongoClient, Db } from 'mongodb';

type ClusterKey = 'ZC' | 'SP' | 'ZG';

const uris: Record<ClusterKey, string> = {
  ZC: process.env.MONGODB_ZC_URI!,
  SP: process.env.MONGODB_SP_URI!,
  ZG: process.env.MONGODB_ZG_URI!,
};

const dbNames: Record<ClusterKey, string> = {
  ZC: 'customer',
  SP: 'service-provider',
  ZG: 'Zinga-dashboard',
};

// Cache connections
const clients: Partial<Record<ClusterKey, MongoClient>> = {};
const dbs: Partial<Record<ClusterKey, Db>> = {};

export async function getDb(cluster: ClusterKey): Promise<Db> {
  if (dbs[cluster]) return dbs[cluster]!;

  if (!clients[cluster]) {
    const client = new MongoClient(uris[cluster], { maxPoolSize: 10 });
    await client.connect();
    clients[cluster] = client;
  }

  const db = clients[cluster]!.db(dbNames[cluster]);
  dbs[cluster] = db;
  return db;
}

// Optional: ensure indexes once
let ensured = false;

export async function ensureUserIndexes() {
  if (ensured) return;
  const database = await getDb('ZG');
  const users = database.collection('users');

  await users.createIndex({ email: 1 }, { unique: true, name: 'uniq_email' });
  await users.createIndex({ role: 1 }, { name: 'role_idx' });

  ensured = true;
}

export async function ensureTelemetryIndexes() {
  const db = await getDb('ZG');
  const col = db.collection('telemetry_events');

  await col.createIndex({ customerUid: 1 });
  await col.createIndex({ deviceId: 1 });
  await col.createIndex({ sessionId: 1 });
  await col.createIndex({ provider: 1 });
  await col.createIndex({ timestamp: -1 });
}

let sentryIndexesEnsured = false;

export async function ensureSentryIndexes() {
  if (sentryIndexesEnsured) return;
  const db = await getDb('ZG');

  const events = db.collection('telemetry_events');
  await events.createIndex({ provider: 1, 'data.level': 1 }, { name: 'sentry_level_idx' });
  await events.createIndex({ provider: 1, timestamp: -1 }, { name: 'sentry_ts_idx' });
  await events.createIndex({ provider: 1, 'data.issueId': 1 }, { name: 'sentry_issue_idx' });

  const stats = db.collection('sentry_stats');
  await stats.createIndex({ createdAt: -1 }, { name: 'stats_ts_idx' });
  await stats.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 86400, name: 'stats_ttl' },
  );

  sentryIndexesEnsured = true;
}

let logRocketIndexesEnsured = false;

export async function ensureLogRocketIndexes() {
  if (logRocketIndexesEnsured) return;
  const db = await getDb('ZG');

  const events = db.collection('telemetry_events');
  await events.createIndex({ provider: 1, 'data.hasErrors': 1 }, { name: 'lr_errors_idx' });
  await events.createIndex({ provider: 1, timestamp: -1 }, { name: 'lr_ts_idx' });
  await events.createIndex({ provider: 1, 'data.sessionId': 1 }, { name: 'lr_session_idx' });

  const stats = db.collection('logrocket_stats');
  await stats.createIndex({ createdAt: -1 }, { name: 'lr_stats_ts_idx' });
  await stats.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 86400, name: 'lr_stats_ttl' },
  );

  logRocketIndexesEnsured = true;
}

let appleIndexesEnsured = false;

export async function ensureAppleIndexes() {
  if (appleIndexesEnsured) return;
  const db = await getDb('ZG');

  const events = db.collection('telemetry_events');
  await events.createIndex({ provider: 1, 'data.rating': 1 }, { name: 'apple_rating_idx' });
  await events.createIndex({ provider: 1, timestamp: -1 }, { name: 'apple_ts_idx' });

  const stats = db.collection('apple_stats');
  await stats.createIndex({ createdAt: -1 }, { name: 'apple_stats_ts_idx' });
  await stats.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 86400, name: 'apple_stats_ttl' },
  );

  appleIndexesEnsured = true;
}

let googlePlayIndexesEnsured = false;

export async function ensureGooglePlayIndexes() {
  if (googlePlayIndexesEnsured) return;
  const db = await getDb('ZG');

  const events = db.collection('telemetry_events');
  await events.createIndex({ provider: 1, 'data.rating': 1 }, { name: 'gplay_rating_idx' });
  await events.createIndex({ provider: 1, timestamp: -1 }, { name: 'gplay_ts_idx' });

  const stats = db.collection('google_play_stats');
  await stats.createIndex({ createdAt: -1 }, { name: 'gplay_stats_ts_idx' });
  await stats.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 86400, name: 'gplay_stats_ttl' },
  );

  googlePlayIndexesEnsured = true;
}

let vercelIndexesEnsured = false;

export async function ensureVercelIndexes() {
  if (vercelIndexesEnsured) return;
  const db = await getDb('ZG');

  const col = db.collection('deployment_events');
  await col.createIndex({ createdAt: -1 }, { name: 'deploy_ts_idx' });
  await col.createIndex({ state: 1 }, { name: 'deploy_state_idx' });
  await col.createIndex({ target: 1 }, { name: 'deploy_target_idx' });
  await col.createIndex({ deploymentId: 1 }, { unique: true, name: 'deploy_id_uniq' });

  vercelIndexesEnsured = true;
}

let stripeIndexesEnsured = false;

export async function ensureStripeIndexes() {
  if (stripeIndexesEnsured) return;
  const db = await getDb('ZG');

  const col = db.collection('stripe_events');
  await col.createIndex({ createdAt: -1 }, { name: 'stripe_ts_idx' });
  await col.createIndex({ type: 1, createdAt: -1 }, { name: 'stripe_type_ts_idx' });
  await col.createIndex({ business: 1, createdAt: -1 }, { name: 'stripe_business_ts_idx' });
  // Stripe retries deliver the same event id; keyed per account so the platform
  // and business accounts can both emit an event with the same id.
  await col.createIndex({ eventId: 1, business: 1 }, { unique: true, name: 'stripe_event_uniq' });

  stripeIndexesEnsured = true;
}
