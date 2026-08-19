'use client';

import { useCurrentUser } from '@/lib/auth/session';
import ProfileForm from '@/components/profile/ProfileForm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import ProfileSkeleton from '@/components/profile/ProfileSkeleton';

export default function ProfilePage() {
  const { user, loading } = useCurrentUser();

  if (loading) return <ProfileSkeleton />;

  if (!user) {
    return <div className="text-sm text-red-500">Not authenticated</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>
    </div>
  );
}
