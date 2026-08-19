'use client';

import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { fetchServiceProviderDetails } from '@/lib/api/serviceProviders';
import { ProviderDetailsSkeleton } from '@/components/skeletons/ProviderDetailsSkeleton';
import { StoreDetails } from '@/components/store/StoreDetails';
import { StoreOwnerDetails } from '@/components/store/StoreOwnerDetails';
import { StoreMediaItem } from '@/components/store/StoreMediaItem';
import { BackButton } from '@/components/common/BackButton';
import StoreServices from '@/components/store/StoreServices';
import { CustomerStats } from '@/components/customers/CustomerStats';
import { formatCurrency } from '@/lib/utils/common';
import { LinkedAccountsBlock } from '@/components/customers/LinkedAccountsBlock';
import { CustomerDevicesBlock } from '@/components/customers/CustomerDevicesBlock';
import { StoreStatusPanel } from '@/components/service-providers/StoreStatusPanel';

export default function ServiceProviderDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['service-provider', id],
    queryFn: () => fetchServiceProviderDetails(id),
  });

  const provider = data?.provider;
  const stats = data?.stats;

  if (isLoading) return <ProviderDetailsSkeleton />;
  if (error) return <div className="py-6 text-red-500">Failed to load service provider</div>;
  if (!provider) return <div className="py-6 text-red-500">Service provider not found</div>;

  return (
    <div className="space-y-6">
      <BackButton />

      {/* Store Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <StoreDetails store={provider} />
        </div>

        {/* RIGHT: Owner Details */}
        <div className="lg:col-span-1">
          {provider.owner && <StoreOwnerDetails ownerDeails={provider.owner} />}
        </div>
      </div>

      <CustomerStats
        stats={[
          { label: 'Total Earned', value: formatCurrency(stats?.totalEarned ?? 0) },
          { label: 'Wallet Balance', value: formatCurrency(stats?.totalEarned ?? 0) },
          { label: 'Booking Requests', value: stats?.bookingRequests ?? 0 },
          { label: 'Active Bookings', value: stats?.activeBookings ?? 0 },
          { label: 'Completed', value: stats?.completedBookings ?? 0 },
        ]}
      />

      {/* Store Services */}
      {provider.services && provider.services.length > 0 && (
        <StoreServices services={provider.services} />
      )}

      {/* Store Media */}
      {provider.storeMedia && provider.storeMedia.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Store Media</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {provider.storeMedia.map((media) => (
              <StoreMediaItem key={media._id || media.url} media={media} />
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Accounts & Activity</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              {/* Linked Accounts */}
              <LinkedAccountsBlock
                stores={provider.owner?.stores}
                isCustomer={provider.owner?.linkedAccounts?.isCustomer}
              />

              {/* Devices */}
              {provider?.owner.sessions?.length && (
                <CustomerDevicesBlock sessions={provider.owner.sessions} />
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              <StoreStatusPanel
                store={{
                  isBlocked: provider.owner?.isBlocked,
                  createdAt: provider.createdAt,
                  updatedAt: provider.updatedAt,
                }}
                sessions={provider.owner?.sessions ?? []}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
