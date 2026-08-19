import { RowAction } from '@/components/common/RowActions';
import { can } from '@/lib/auth';
import { Role } from '@/lib/roles';
import { Customer } from '@/lib/types';

type Params = {
  currentRole?: Role;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
};

export function createCustomerRowActions({ currentRole, onToggleStatus, onDelete }: Params) {
  return (customer: Customer): RowAction<Customer>[] => {
    const isDisabled = customer.status === 'disabled';

    return [
      {
        label: isDisabled ? 'Enable customer' : 'Disable customer',
        onClick: () => onToggleStatus(customer._id),
        hidden: isDisabled
          ? !can(currentRole, 'customers.enable')
          : !can(currentRole, 'customers.disable'),
      },

      {
        separatorBefore: true,
        label: 'Delete customer',
        destructive: true,
        onClick: () => onDelete(customer._id),
        hidden: !can(currentRole, 'customers.delete'),
      },
    ];
  };
}
