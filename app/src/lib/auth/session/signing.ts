// HMAC-signed session activity stamps (zinga_seen / zinga_start).
// The cookies are httpOnly (JS can't read/write them), but the *value* was plain
// epoch-ms and thus forgeable in a crafted request. Signing makes them tamper-
// evident: a modified/forged value fails verification and is treated as absent.
// Web Crypto so this runs in the (edge) middleware runtime. Key derives from the
// server-only SUPABASE_SECRET_KEY (never shipped to the client).

const enc = new TextEncoder();

let keyPromise: Promise<CryptoKey> | null = null;
function hmacKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    const secret = process.env.SUPABASE_SECRET_KEY || 'dev-insecure-session-key';
    keyPromise = crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    );
  }
  return keyPromise;
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function hexToBuf(hex: string): ArrayBuffer {
  const out = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out.buffer;
}

// Produce a signed stamp: `<epoch-ms>.<hmac-hex>`.
export async function signStamp(ts: number): Promise<string> {
  const key = await hmacKey();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(String(ts)));
  return `${ts}.${toHex(sig)}`;
}

// Verify a signed stamp; returns the epoch-ms if the signature is valid, else null
// (missing, malformed, or tampered → null → caller treats as "no valid stamp").
export async function verifyStamp(value: string | undefined | null): Promise<number | null> {
  if (!value) return null;
  const dot = value.lastIndexOf('.');
  if (dot <= 0) return null;
  const tsStr = value.slice(0, dot);
  const sigHex = value.slice(dot + 1);
  const ts = Number(tsStr);
  if (!Number.isFinite(ts) || !/^[0-9a-f]+$/i.test(sigHex)) return null;
  try {
    const key = await hmacKey();
    const ok = await crypto.subtle.verify('HMAC', key, hexToBuf(sigHex), enc.encode(tsStr));
    return ok ? ts : null;
  } catch {
    return null;
  }
}
