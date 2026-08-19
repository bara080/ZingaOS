import { RowAction } from '@/components/common/RowActions';
import { ServiceProvider } from '@/lib/types';
import { Role } from '@/lib/roles';
import { can } from '@/lib/auth';

type Params = {
  currentRole?: Role;
  onManage: (id: string) => void;
  onDelete: (id: string) => void;
};

export function createServiceProviderRowActions({ currentRole, onManage, onDelete }: Params) {
  return (provider: ServiceProvider): RowAction<ServiceProvider>[] => {
    const isDisabled = provider.status === 'disabled';

    return [
      {
        label: isDisabled ? 'Enable store' : 'Disable store',
        onClick: () => onManage(provider.id),
        hidden: isDisabled
          ? !can(currentRole, 'service-providers.enable')
          : !can(currentRole, 'service-providers.disable'),
      },

      {
        separatorBefore: true,
        label: 'Delete store',
        destructive: true,
        onClick: () => onDelete(provider.id),
        hidden: !can(currentRole, 'service-providers.delete'),
      },
    ];
  };
}
