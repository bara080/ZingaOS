import { ServiceProvider } from '@/lib/types';
import { CategoryBadge } from '@/components/category/CategoryBadge';
import { LocationText } from '@/components/common/LocationText';
import { formatDate } from '@/lib/utils/common';
import { AvatarCell } from '../common/AvatarCell';

export const serviceProviderColumns = [
  {
    key: 'store',
    header: 'Store',
    render: (sp: ServiceProvider) => (
      <AvatarCell
        name={sp.company}
        avatar={sp.storeLogo}
        subtitle={sp.description || '-'}
        rounded="md"
      />
    ),
  },
  {
    key: 'category',
    header: 'Category',
    render: (sp: ServiceProvider) => <CategoryBadge category={sp.category} />,
  },
  {
    key: 'owner',
    header: 'Owner',
    render: (sp: ServiceProvider) => (
      <AvatarCell
        name={sp.name}
        avatar={sp.avatar}
        subtitle={sp.email || sp.phone || '-'}
        rounded="full"
        size={32}
      />
    ),
  },
  {
    key: 'location',
    header: 'Location',
    render: (sp: ServiceProvider) => <LocationText city={sp.city} country={sp.country} />,
  },
  {
    key: 'created',
    header: 'Created',
    render: (sp: ServiceProvider) => formatDate(sp.createdAt),
  },
];
