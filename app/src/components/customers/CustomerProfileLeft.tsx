'use client';

import { Mail, Phone, Shield } from 'lucide-react';
import { Customer } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '../common/Avatar';
import { InfoRow } from '../common/InfoRow';
import { StatusBadges } from '../common/StatusBadges';

interface Props {
  customer: Customer;
}

export function CustomerProfileLeft({ customer }: Props) {
  return (
    <Card>
      <CardContent className="flex flex-col sm:flex-row gap-6">
        <div>
          <Avatar src={customer.avatar} name={customer.displayName} size={96} rounded="full" />
        </div>

        <div className="flex-1 space-y-1 text-center sm:text-left">
          <h2 className="text-2xl font-bold">{customer.displayName}</h2>

          <StatusBadges
            className="justify-center sm:justify-start pt-3"
            items={[
              {
                key: 'email',
                label: 'Email Verified',
                show: customer.emailVerified,
                variant: 'success',
                icon: <Mail className="w-3 h-3" />,
              },
              {
                key: 'phone',
                label: 'Phone Verified',
                show: customer.phoneVerified,
                variant: 'info',
                icon: <Phone className="w-3 h-3" />,
              },
              {
                key: 'provider',
                label: customer.authProvider ?? '',
                show: !!customer.authProvider,
                variant: 'neutral',
                icon: <Shield className="w-3 h-3" />,
              },
            ]}
          />

          <div className="pt-2 space-y-2 text-sm">
            <InfoRow value={customer.activeAccount?.role} icon={<Shield className="w-4 h-4" />} />
            <InfoRow value={customer.email} icon={<Mail className="w-4 h-4" />} />
            <InfoRow value={customer.phoneNumber} icon={<Phone className="w-4 h-4" />} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
