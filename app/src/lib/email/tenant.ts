// SINGLE-TENANT tenant constant for the email engine.
//
// The ported lagosMailer engine threaded a `company` string from a client
// `x-company` header through every call. Zinga is single-tenant: the tenant is
// ALWAYS this server-derived constant. It is NEVER read from a request or header.
// The `company` column still exists on every ops.email_* table (defaulting to
// 'zinga') so the schema stays tenant-ready, but the value is only ever this.
//
// The SQL RPCs hard-code company='zinga' internally, so this constant is used by
// the Node engine only for its own bookkeeping (it is never sent to the DB).
export const COMPANY = 'zinga' as const;
