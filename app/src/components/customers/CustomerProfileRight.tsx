'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoField } from '../common/InfoField';
import { Customer } from '@/lib/types';

interface Props {
  customer: Customer;
}

export function CustomerProfileRight({ customer }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm grid grid-cols-1 gap-6">
          <InfoField label="UID" value={customer.uid} copyValue={customer.uid} />
          <InfoField label="Stripe ID" value={customer.stripeId} copyValue={customer.stripeId} />
        </div>
      </CardContent>
    </Card>
  );
}
