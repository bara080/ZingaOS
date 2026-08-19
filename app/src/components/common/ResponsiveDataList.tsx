'use client';

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { CardSkeleton } from '../skeletons/CardSkeleton';
import { TableRowSkeleton } from '../skeletons/TableRowSkeleton';
import { cn } from '@/lib/utils/common';
import { RowActions, RowAction } from './RowActions';

type Column<T> = {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
};

type Props<T> = {
  items: T[];
  loading: boolean;
  limit: number;

  columns: Column<T>[];
  rowKey: (item: T) => string;
  onRowClick?: (item: T) => void;

  displayActions?: boolean;
  rowActions?: (item: T) => RowAction<T>[];

  /** Skeleton config */
  tableSkeleton?: {
    columns?: number;
    withAvatar?: boolean;
  };

  cardSkeleton?: {
    lines?: number;
    avatar?: boolean;
  };

  renderCard: (item: T) => React.ReactNode;
};

export function ResponsiveDataList<T>({
  items,
  loading,
  limit,
  columns,
  rowKey,
  onRowClick,
  displayActions,
  rowActions,
  tableSkeleton,
  renderCard,
  cardSkeleton,
}: Props<T>) {
  const skeletonColumns = tableSkeleton?.columns ?? columns.length + (displayActions ? 1 : 0);

  const ACTIONS_COL_WIDTH = 'w-16';

  return (
    <>
      {/* Mobile */}
      <div className="w-full grid gap-3 md:hidden">
        {loading
          ? Array.from({ length: limit }).map((_, i) => (
              <CardSkeleton
                key={i}
                lines={cardSkeleton?.lines}
                avatar={cardSkeleton?.avatar}
                withActions={displayActions}
              />
            ))
          : items.map((item) => (
              <div className="w-full" key={rowKey(item)} onClick={() => onRowClick?.(item)}>
                {renderCard(item)}
              </div>
            ))}
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.header}</TableHead>
              ))}
              {/* Header */}
              {displayActions && <TableHead className={`${ACTIONS_COL_WIDTH} text-right`} />}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading
              ? Array.from({ length: limit }).map((_, i) => (
                  <TableRowSkeleton
                    key={i}
                    columns={skeletonColumns}
                    withAvatar={tableSkeleton?.withAvatar}
                    hasActions={displayActions}
                  />
                ))
              : items.map((item) => (
                  <TableRow
                    key={rowKey(item)}
                    className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                    onClick={() => onRowClick?.(item)}
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          'p-4',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                        )}
                      >
                        {col.render(item)}
                      </TableCell>
                    ))}

                    {/* Cell */}
                    {displayActions && rowActions && (
                      <TableCell
                        className={`${ACTIONS_COL_WIDTH} p-2 text-right`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RowActions item={item} actions={rowActions(item)} />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
