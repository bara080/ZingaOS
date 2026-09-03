// Thin provider abstraction for the email engine. Stage 1 = SMTP only (via the
// dependency-free sender in src/lib/operator/smtp.ts). Resend and other providers
// are deferred to Stage 3 — this indirection is where they'll slot in.
import { sendEmail } from '@/lib/operator/smtp';

export type SendInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendResult = { messageId: string | null };

// Send one message through the configured provider. Throws on any provider-level
// rejection — the engine records the failure per-recipient.
export async function sendViaProvider(input: SendInput): Promise<SendResult> {
  const { messageId } = await sendEmail({
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  return { messageId: messageId || null };
}

// Provider label recorded on each recipient (matches env config / future routing).
export const PROVIDER = 'smtp' as const;
