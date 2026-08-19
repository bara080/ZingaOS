import { ServiceProvider } from '@/lib/types';
import { Avatar } from '@/components/common/Avatar';
import { CategoryBadge } from '@/components/category/CategoryBadge';
import { LocationText } from '@/components/common/LocationText';
import { RowAction, RowActions } from '../common/RowActions';

type Props = {
  provider: ServiceProvider;
  rowActions?: RowAction<ServiceProvider>[];
};

export function ServiceProviderCard({ provider, rowActions }: Props) {
  const hasActions = rowActions && rowActions.length > 0;

  return (
    <div className="relative rounded-lg border p-3 space-y-3">
      {hasActions && (
        <div className="absolute top-2 right-2">
          <RowActions item={provider} actions={rowActions} />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Avatar src={provider.storeLogo} name={provider.company} size={40} rounded="md" />
        <div>
          <div className="font-medium">{provider.company}</div>
          <div className="text-xs text-muted-foreground truncate">
            {provider.description || '-'}
          </div>
        </div>
      </div>

      <CategoryBadge category={provider.category} />

      <div className="flex items-center gap-3">
        <Avatar src={provider.avatar} name={provider.name} size={32} rounded="full" />
        <div>
          <div className="text-sm font-medium">{provider.name || 'Unknown'}</div>
          <div className="text-xs text-muted-foreground">
            {provider.email || provider.phone || '-'}
          </div>
        </div>
      </div>

      <LocationText city={provider.city} country={provider.country} />
    </div>
  );
}
