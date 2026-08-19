'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

export default function AcceptInvitePage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  // The invite magic link establishes a Supabase session (detectSessionInUrl).
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setHasSession(!!data.user);
      setChecking(false);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  async function handleAcceptInvite() {
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      // Set the password on the session established by the invite token.
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);

      // Flip profile status invited -> active (service-role, server-side).
      await fetch('/api/auth/accept-invite', { method: 'POST' });

      setSuccess(true);
      setTimeout(() => router.push('/overview'), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to accept invitation.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!checking && !hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-sm">Invalid or expired invitation link.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <p className="text-sm text-muted-foreground">
            Set your password to activate your admin account.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}

          {success && (
            <p className="text-sm text-green-600">Invitation accepted! Redirecting…</p>
          )}

          {!success && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="********"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleAcceptInvite}
                disabled={submitting || checking}
              >
                {submitting ? 'Activating...' : 'Accept Invitation'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
