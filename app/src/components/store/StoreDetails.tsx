'use client';

import { KeyRound, Mail, MapPin, Phone, SquareUserRound } from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { CategoryBadge } from '@/components/category/CategoryBadge';
import { Store } from '@/lib/types';
import { Card, CardContent } from '../ui/card';
import { StatusBadges } from '../common/StatusBadges';
import { ServiceDescription } from '../service-fields';
import { InfoRow } from '../common/InfoRow';
import { formatDate } from '@/lib/utils/common';

type Props = {
  store: Store;
  showOwnerBadge?: boolean;
};

const getGoogleMapsUrl = (lat?: number, lng?: number) => {
  if (lat == null || lng == null) return '#';
  return `https://www.google.com/maps?q=${lat},${lng}`;
};

export function StoreDetails({ store }: Props) {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Logo */}
          <div className="shrink-0 flex flex-col items-center">
            <Avatar src={store.storeLogo} name={store.storeName} size={160} rounded="md" />
          </div>

          {/* Info */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="w-full text-3xl font-bold">{store.storeName}</h2>

              {store.storeCategory && <CategoryBadge category={store.storeCategory} />}

              <StatusBadges
                className="justify-center sm:justify-start"
                items={[
                  {
                    key: 'freelancer',
                    label: 'Freelancer',
                    show: !!store.isFreelancer,
                    variant: 'neutral',
                    icon: <SquareUserRound className="w-3 h-3" />,
                  },
                ]}
              />
            </div>

            <ServiceDescription value={store.storeDescription} />

            {/* Contact */}
            <div className="space-y-1 text-sm">
              <InfoRow value={store.storeId} icon={<KeyRound className="w-4 h-4" />} />
              <InfoRow value={store.storeEmail} icon={<Mail className="w-4 h-4" />} />
              <InfoRow value={store.storePhone} icon={<Phone className="w-4 h-4" />} />
              <div className="flex gap-3">
                <InfoRow value={store.location?.address} icon={<MapPin className="w-4 h-4" />} />
                {store.location.lat && store.location.lng && (
                  <a
                    href={getGoogleMapsUrl(store.location.lat, store.location.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium hover:underline"
                  >
                    View on map
                  </a>
                )}
              </div>
            </div>

            <div className="pt-2 text-xs text-muted-foreground">
              Registered on: {formatDate(store.createdAt)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
