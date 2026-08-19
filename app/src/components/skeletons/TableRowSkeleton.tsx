import { TableRow, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

type Props = {
  columns: number;
  withAvatar?: boolean;
  hasActions?: boolean;
};

export function TableRowSkeleton({ columns, withAvatar, hasActions }: Props) {
  return (
    <TableRow>
      {Array.from({ length: columns }).map((_, i) => {
        const isActionsColumn = hasActions && i === columns - 1;

        return (
          <TableCell key={i} className={isActionsColumn ? 'w-16 text-right' : undefined}>
            {isActionsColumn ? (
              <Skeleton className="h-8 w-8 ml-auto rounded-md" />
            ) : i === 0 && withAvatar ? (
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <Skeleton className="h-4 w-24" />
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
}
