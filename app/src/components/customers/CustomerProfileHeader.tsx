'use client';

import { Customer } from '@/lib/types';
import { CustomerProfileLeft } from './CustomerProfileLeft';
import { CustomerProfileRight } from './CustomerProfileRight';

interface Props {
  customer: Customer;
}

export function CustomerProfileHeader({ customer }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="col-span-2">
        <CustomerProfileLeft customer={customer} />
      </div>
      <div>
        <CustomerProfileRight customer={customer} />
      </div>
    </div>
  );
}
