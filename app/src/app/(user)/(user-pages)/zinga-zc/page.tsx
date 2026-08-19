'use client';

/**
 * Zinga Customers – List Page
 *
 * This page follows the standard "Paginated + Filtered List" architecture
 * used across the Zinga Admin dashboard.
 *
 * Key responsibilities:
 * 1. Manage pagination & applied filters via `usePaginatedFilters`
 * 2. Delegate filter UI to `FiltersForm`
 * 3. Delegate list rendering to `ResponsiveDataList`
 * 4. Keep routing, fetching, and UI concerns clearly separated
 */

import { Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { PaginatedListPage } from '@/components/common/PaginatedListPage';
import { ResponsiveDataList } from '@/components/common/ResponsiveDataList';
import { FiltersForm } from '@/components/common/FiltersForm';

import { fetchCustomers } from '@/lib/api/customers';
import { usePaginatedFilters } from '@/hooks/usePaginatedFilters';
import { exportToCSV } from '@/lib/utils/exportToCSV';

import { Customer } from '@/lib/types';
import { CustomerFilters, customerFiltersConfig } from '@/lib/filters/customers';
import { customerColumns } from '@/components/customers/customerColumns';
import { useMemo } from 'react';
import { createCustomerRowActions } from '@/components/customers/customerRowActions';
import { can, useCurrentUser } from '@/lib/auth';
import { CustomerCard } from '@/components/customers/CustomerCard';

/**
 * Default filter values
 *
 * ⚠️ Important:
 * - These values define the "no filters applied" state
 * - `FiltersForm` relies on this object to decide when Reset is shown
 * - Keep this in sync with backend defaults
 */
const defaultFilters: CustomerFilters = {
  name: '',
  email: '',
  phone: '',
  uid: '',
  registeredFrom: '',
  registeredTo: '',
};

export default function ZingaCustomers() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();

  /**
   * usePaginatedFilters handles:
   * - Current page state
   * - Draft vs applied filters
   * - Query key composition
   * - Page reset on filter changes
   *
   * IMPORTANT:
   * - `filters` here represent APPLIED filters (not draft UI state)
   * - Draft state lives inside <FiltersForm />
   */
  const { page, setPage, filters, applyFilters, resetFilters, query, totalPages, limit } =
    usePaginatedFilters<CustomerFilters, { customers: Customer[]; total: number }>({
      queryKey: 'customers',
      defaultFilters,
      fetchFn: fetchCustomers,
    });

  const customers = query.data?.customers ?? [];
  const total = query.data?.total ?? 0;

  const canSeeActions = can(user?.role, 'customers.enable') || can(user?.role, 'customers.delete');

  /**
   * Row actions (RBAC aware)
   */
  const rowActions = useMemo(
    () =>
      createCustomerRowActions({
        currentRole: user?.role,

        onToggleStatus: (id) => {
          console.log('Toggle customer status:', id);
          // TODO: open confirm dialog + mutation
        },

        onDelete: (id) => {
          console.log('Delete customer:', id);
          // TODO: open confirm dialog + mutation
        },
      }),
    [user?.role],
  );

  // Wait for auth
  if (userLoading) return null;

  // Permission guard
  if (!can(user?.role, 'customers.view')) {
    return <div className="p-6 text-red-500">Access denied</div>;
  }

  // Fetch error
  if (query.error instanceof Error) {
    return <div className="p-6 text-red-500">{query.error.message}</div>;
  }

  return (
    <PaginatedListPage<Customer, CustomerFilters>
      title="Customers"
      description="List of all customers connected to Zinga app."
      icon={<Users className="h-5 w-5" />}
      /**
       * Pagination + list state
       */
      items={customers}
      total={total}
      page={page}
      totalPages={totalPages}
      limit={limit}
      loading={query.isFetching}
      /**
       * Applied filters (NOT draft)
       * Used for:
       * - CSV export
       * - Showing active filters
       * - Query key stability
       */
      filters={filters}
      /**
       * Filters UI
       *
       * FiltersForm manages its own draft state and only calls:
       * - onApply → when user explicitly applies filters
       * - onReset → when user resets to defaults
       */
      FiltersComponent={({ filters, onApply, onReset }) => (
        <FiltersForm
          fields={customerFiltersConfig}
          defaultFilters={defaultFilters}
          filters={filters}
          onApply={onApply}
          onReset={onReset}
        />
      )}
      /**
       * Handlers for applying/resetting filters
       * These come directly from usePaginatedFilters
       */
      onApplyFilters={applyFilters}
      onResetFilters={resetFilters}
      /**
       * List rendering
       *
       * ResponsiveDataList automatically switches between:
       * - Table view (desktop)
       * - Card view (mobile)
       */
      ListComponent={({ items, loading, limit }) => (
        <ResponsiveDataList<Customer>
          items={items}
          loading={loading}
          limit={limit}
          rowKey={(c) => c._id}
          onRowClick={(c) => router.push(`/zinga-zc/${c._id}`)}
          columns={customerColumns}
          displayActions={canSeeActions}
          rowActions={canSeeActions ? rowActions : undefined}
          renderCard={(c) => (
            <CustomerCard customer={c} rowActions={canSeeActions ? rowActions(c) : undefined} />
          )}
          tableSkeleton={{ withAvatar: true }}
          cardSkeleton={{ lines: 3, avatar: true }}
        />
      )}
      /**
       * Pagination controls
       */
      onPrev={() => setPage((p) => Math.max(1, p - 1))}
      onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      /**
       * Page utilities
       */
      onRefresh={() => query.refetch()}
      onCsvExport={() => exportToCSV(customers, 'zinga_customers.csv')}
    />
  );
}
