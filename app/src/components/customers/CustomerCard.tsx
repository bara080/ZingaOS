import { Customer } from '@/lib/types';
import { Avatar } from '@/components/common/Avatar';
import { RowAction, RowActions } from '../common/RowActions';

type Props = {
  customer: Customer;
  rowActions?: RowAction<Customer>[];
};

export function CustomerCard({ customer, rowActions }: Props) {
  const hasActions = rowActions && rowActions.length > 0;

  return (
    <div className="w-full rounded-lg border p-3 space-y-2 hover:bg-muted/50 transition">
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* LEFT: Avatar + text */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar src={customer.avatar} name={customer.displayName} size={32} />

          {/* TEXT COLUMN */}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{customer.displayName || '-'}</div>

            <div className="text-xs text-muted-foreground break-all line-clamp-1">
              {customer.email || '-'}
            </div>
          </div>
        </div>

        {/* RIGHT: Actions */}
        {hasActions && (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <RowActions item={customer} actions={rowActions} />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="text-sm truncate">{customer.phoneNumber || '-'}</div>

      <div className="font-mono text-xs text-muted-foreground truncate">{customer.uid}</div>
    </div>
  );
}
