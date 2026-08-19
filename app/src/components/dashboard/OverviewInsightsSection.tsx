'use client';

import { useMemo } from 'react';
import { buildOverviewAnalytics } from './buildOverviewAnalytics';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { OverviewSample } from './types';

interface Props {
  sample: OverviewSample;
}

export function OverviewInsightsSection({ sample }: Props) {
  const analytics = useMemo(() => buildOverviewAnalytics(sample), [sample]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* Funnel */}
      <Card className="bg-primary-foreground">
        <CardHeader>
          <CardTitle>Funnel Overview</CardTitle>
          <CardDescription>Where you gain/lose users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span>Visits → Signups</span>
            <span>{analytics.signupRate.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Signups → Bookings</span>
            <span>{analytics.bookingFromSignup.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Visits → Bookings</span>
            <span>{analytics.conversion.toFixed(2)}%</span>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Tip: improve onboarding to lift signup rate.
        </CardFooter>
      </Card>

      {/* Risk */}
      <Card className="bg-primary-foreground">
        <CardHeader>
          <CardTitle>Risk & Support</CardTitle>
          <CardDescription>Operational pressure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span>Churn (30d)</span>
            <span>{analytics.churnRate.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Refund Rate</span>
            <span>{analytics.refundRate.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Tickets / 1k Users</span>
            <span>{analytics.ticketPer1kUsers.toFixed(1)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Quality */}
      <Card className="bg-primary-foreground">
        <CardHeader>
          <CardTitle>Quality & Trust</CardTitle>
          <CardDescription>Experience signals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span>Dispute Rate</span>
            <span>{analytics.disputeRate.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Reject After Accept</span>
            <span>{analytics.rejectAfterAcceptRate.toFixed(2)}%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
