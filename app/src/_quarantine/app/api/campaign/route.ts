import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import {
  createCampaign,
  getCampaigns,
  deleteCampaign,
  updateCampaignStatus,
} from '@/features/email-campaign/api/campaigns';
import { getAudienceCount } from '@/features/email-campaign/lib/audience';
import { CreateCampaignInput } from '@/features/email-campaign/types/campaign.types';
import { Role } from '@/lib/roles';

const COOKIE_NAME = process.env.COOKIE_NAME || 'zinga_session';
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

type AdminSession = {
  role: Role;
  // Add other fields your JWT actually contains, e.g. email: string
};

/**
 * Verifies the session cookie and returns the payload.
 * Returns null if the token is missing or invalid.
 * We validate the role exists rather than a uid, since your JWT
 * is signed with { role } rather than a user ID claim.
 */
async function getSession(req: NextRequest): Promise<AdminSession | null> {
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

// GET /api/campaign — list all campaigns
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const campaigns = await getCampaigns();
    return NextResponse.json({ campaigns });
  } catch (err) {
    console.error('GET /api/campaign error:', err);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

// POST /api/campaign — create a new draft campaign
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body: CreateCampaignInput = await req.json();

    if (!body.title || !body.subject || !body.body || !body.audienceType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [campaign, recipientCount] = await Promise.all([
      createCampaign(body, session.role), // using role as the creator identifier
      getAudienceCount(body.audienceType),
    ]);

    await updateCampaignStatus(campaign._id, 'draft', { recipientCount });

    return NextResponse.json({ campaign: { ...campaign, recipientCount } }, { status: 201 });
  } catch (err) {
    console.error('POST /api/campaign error:', err);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}

// DELETE /api/campaign?id=xxx — delete a draft campaign
export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });

  try {
    await deleteCampaign(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/campaign error:', err);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
