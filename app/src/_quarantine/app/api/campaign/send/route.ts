import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getCampaignById, updateCampaignStatus } from '@/features/email-campaign/api/campaigns';
import { resolveAudience } from '@/features/email-campaign/lib/audience';
import { sendCampaignEmail } from '@/features/email-campaign/lib/sender';
import { Role } from '@/lib/roles';

const COOKIE_NAME = process.env.COOKIE_NAME || 'zinga_session';
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

async function getSession(req: NextRequest): Promise<{ role: Role } | null> {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET);
    const role = payload.role as Role | undefined;
    if (!role) return null;

    return { role };
  } catch {
    return null;
  }
}

// POST /api/campaign/send
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { campaignId } = await req.json();
  if (!campaignId) return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 });

  const campaign = await getCampaignById(campaignId);
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  if (campaign.status === 'sent') {
    return NextResponse.json({ error: 'Campaign already sent' }, { status: 409 });
  }
  if (campaign.status === 'sending') {
    return NextResponse.json({ error: 'Campaign is already sending' }, { status: 409 });
  }

  await updateCampaignStatus(campaignId, 'sending');

  try {
    const recipients = await resolveAudience(campaign.audienceType);

    if (recipients.length === 0) {
      await updateCampaignStatus(campaignId, 'failed', {
        errorMessage: 'No recipients found for this audience type',
      });
      return NextResponse.json({ error: 'No recipients found' }, { status: 400 });
    }

    const result = await sendCampaignEmail(recipients, campaign.subject, campaign.body);

    const finalStatus = result.failedCount === recipients.length ? 'failed' : 'sent';
    await updateCampaignStatus(campaignId, finalStatus, {
      recipientCount: recipients.length,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      sentAt: new Date().toISOString(),
      sendgridBatchId: result.sendgridBatchId,
      errorMessage: result.errorMessage,
    });

    return NextResponse.json({
      success: true,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
    });
  } catch (err) {
    console.error('Campaign send error:', err);
    await updateCampaignStatus(campaignId, 'failed', {
      errorMessage: err instanceof Error ? err.message : 'Unknown error during send',
    });
    return NextResponse.json({ error: 'Failed to send campaign' }, { status: 500 });
  }
}
