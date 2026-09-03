// Render-time email body cleaner for the Inbox email channel. Pure + client-safe.
// Trims the noise most inbound emails carry — quoted reply history, signature
// blocks, and long tracking/pixel URLs — so the reading pane shows just the actual
// message. NON-destructive: the full body stays in ops.email_messages (+ raw);
// this only affects display. Deliberately conservative — if it would strip
// everything, it falls back to the original.

// Markers that begin quoted reply / forwarded history — cut from the earliest one.
const QUOTE_CUTS: RegExp[] = [
  /^On\b.{0,200}\bwrote:\s*$/m, // Gmail "On <date> <person> wrote:"
  /^-{2,}\s*Original Message\s*-{2,}/im, // Outlook
  /^-{2,}\s*Forwarded message\s*-{2,}/im, // Gmail forward
  /^_{5,}\s*$/m, // Outlook "______" separator
  /^\s*>{1,}\s?.*/m, // start of a ">" quoted block
  /^From:\s.+\r?\nSent:\s/im, // Outlook header block (From:\nSent:)
];

export function cleanEmailBody(raw: string | null | undefined): string {
  if (!raw) return '';
  let t = raw.replace(/\r\n/g, '\n');

  // 1) Cut quoted / forwarded history at the earliest marker.
  let cut = t.length;
  for (const re of QUOTE_CUTS) {
    const m = re.exec(t);
    if (m && m.index >= 0 && m.index < cut) cut = m.index;
  }
  t = t.slice(0, cut);

  // 2) Cut the signature at the standard "-- " delimiter line.
  const sig = /\n-- \n/.exec(t);
  if (sig) t = t.slice(0, sig.index);

  // 3) Strip long tracking / pixel URLs (bracketed + bare).
  t = t.replace(/\[\s*https?:\/\/[^\]]{40,}\]/gi, ''); // [https://very-long-tracking…]
  t = t.replace(/https?:\/\/\S{90,}/gi, '[link]'); // bare very-long URLs → [link]

  // 4) Collapse whitespace.
  t = t
    .replace(/[ \t]+\n/g, '\n') // trailing spaces
    .replace(/\n{3,}/g, '\n\n') // 3+ blank lines → one
    .trim();

  return t || raw.trim(); // never return empty if we over-stripped
}

// One-line preview for the conversation list (cleaned, single line, no URLs).
export function emailPreview(raw: string | null | undefined): string {
  const c = cleanEmailBody(raw)
    .replace(/\[link\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return c;
}
