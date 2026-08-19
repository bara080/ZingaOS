'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTableFooter } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { RefreshCcw, Download } from 'lucide-react';
import { RowAction } from './RowActions';

type Props<TItem, TFilters> = {
  title: string;
  description: string;
  icon: React.ReactNode;
  pageActions?: React.ReactNode;

  filters: TFilters;
  FiltersComponent: React.ComponentType<{
    filters: TFilters;
    onApply: (filters: TFilters) => void;
    onReset: () => void;
  }>;

  ListComponent: React.ComponentType<{
    items: TItem[];
    loading: boolean;
    limit: number;
    displayActions?: boolean;
    rowActions?: (item: TItem) => RowAction<TItem>[];
  }>;

  items: TItem[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  loading: boolean;

  onPrev: () => void;
  onNext: () => void;
  onRefresh: () => void;
  onCsvExport: () => void;

  onApplyFilters: (filters: TFilters) => void;
  onResetFilters: () => void;

  /** ✅ NEW */
  displayActions?: boolean;
  rowActions?: (item: TItem) => RowAction<TItem>[];
};

export function PaginatedListPage<TItem, TFilters>({
  title,
  description,
  icon,
  pageActions,

  filters,
  FiltersComponent,
  ListComponent,

  items,
  total,
  page,
  totalPages,
  limit,
  loading,

  onPrev,
  onNext,
  onRefresh,
  onCsvExport,

  onApplyFilters,
  onResetFilters,

  displayActions,
  rowActions,
}: Props<TItem, TFilters>) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} icon={icon} actions={pageActions} />

      <FiltersComponent filters={filters} onApply={onApplyFilters} onReset={onResetFilters} />

      <Card className="bg-primary-foreground">
        <CardHeader className="border-b items-center">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex flex-col gap-2">
              <CardTitle>{title}</CardTitle>
              <CardDescription>
                Showing {items.length.toLocaleString()} of {total.toLocaleString()}
              </CardDescription>
            </div>

            <CardAction className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onCsvExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>

              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardAction>
          </div>
        </CardHeader>

        <CardContent>
          <ListComponent
            items={items}
            loading={loading}
            limit={limit}
            displayActions={displayActions}
            rowActions={rowActions}
          />
        </CardContent>

        <CardFooter>
          <DataTableFooter
            page={page}
            totalPages={totalPages}
            total={total}
            onPrev={onPrev}
            onNext={onNext}
          />
        </CardFooter>
      </Card>
    </div>
  );
}
