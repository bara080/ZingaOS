'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchCustomerDetails } from '@/lib/api/customers';
import { CustomerDetailsSkeleton } from '@/components/skeletons/CustomerDetailsSkeleton';
import { CustomerProfileHeader } from '@/components/customers/CustomerProfileHeader';
import { CustomerActivityPanel } from '@/components/customers/CustomerActivityPanel';
import { BackButton } from '@/components/common/BackButton';

export default function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const {
    data: customer,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => fetchCustomerDetails(id),
  });

  if (isLoading) return <CustomerDetailsSkeleton />;
  if (error) return <div className="py-6 text-red-500">Failed to load service provider</div>;
  if (!customer) return <div className="py-6 text-red-500">Customer not found</div>;

  return (
    <div className="space-y-6">
      <BackButton />

      <CustomerProfileHeader customer={customer} />

      <CustomerActivityPanel
        customer={customer}
        linkedAccounts={customer.linkedAccounts}
        sessions={customer.sessions}
      />
    </div>
  );
}
