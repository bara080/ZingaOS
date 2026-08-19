import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-6 py-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Manage your password and account security
          </p>

          <Link
            href="/settings/security"
            className="text-sm font-medium text-primary hover:underline"
          >
            Change password →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
