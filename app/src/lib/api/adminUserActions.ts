export type AdminUserAction =
  | 'invite.resend'
  | 'invite.cancel'
  | 'user.disable'
  | 'user.enable'
  | 'user.delete';

export async function adminUserAction(userId: string, action: AdminUserAction) {
  const res = await fetch(`/api/users/${userId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? 'Action failed');
  }

  return res.json();
}
