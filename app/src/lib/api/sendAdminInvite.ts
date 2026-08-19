import { Role } from '@/lib/roles';

type InvitePayload = {
  email: string;
  role: Role;
};

export async function sendAdminInvite(payload: InvitePayload) {
  const res = await fetch('/api/admin-invites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Failed to send invite');
  }

  return data;
}
