import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { AudienceRecipient } from './audience';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const FROM_EMAIL = 'no-reply@zingaapp.com';
const FROM_NAME = 'Zinga Admin';

// SendGrid allows up to 1000 personalizations per request
const BATCH_SIZE = 1000;

export type CampaignSendResult = {
  sentCount: number;
  failedCount: number;
  sendgridBatchId?: string;
  errorMessage?: string;
};

/**
 * Sends a campaign email to all recipients using SendGrid personalizations.
 * Splits into batches of 1000 to stay within SendGrid limits and
 * avoid Vercel/Node timeout on large audiences.
 */
export async function sendCampaignEmail(
  recipients: AudienceRecipient[],
  subject: string,
  htmlBody: string,
): Promise<CampaignSendResult> {
  if (recipients.length === 0) {
    return { sentCount: 0, failedCount: 0 };
  }

  let sentCount = 0;
  let failedCount = 0;
  let lastBatchId: string | undefined;

  // Chunk recipients into batches
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    const personalizations = batch.map((r) => ({
      to: [{ email: r.email, name: r.name }],
      substitutions: { name: r.name },
    }));

    try {
      const payload: MailDataRequired = {
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        html: htmlBody,
        personalizations,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
        },
      };

      const [response] = await sgMail.send(payload);

      // X-Message-Id header is the batch message ID from SendGrid
      lastBatchId = (response.headers as Record<string, string>)['x-message-id'];
      sentCount += batch.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`SendGrid batch ${i / BATCH_SIZE + 1} failed:`, message);
      failedCount += batch.length;
    }
  }

  return {
    sentCount,
    failedCount,
    sendgridBatchId: lastBatchId,
    errorMessage: failedCount > 0 ? `${failedCount} recipients failed` : undefined,
  };
}
