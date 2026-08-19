import { Suspense } from 'react';
import ChangePasswordForm from '@/components/settings/ChangePasswordForm';
import ChangePasswordSkeleton from '@/components/settings/ChangePasswordSkeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function SecuritySettingsPage() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Security</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<ChangePasswordSkeleton />}>
          <ChangePasswordForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
