'use client';

/**
 * Zinga Service Providers – List Page
 *
 * This page follows the standard "Paginated + Filtered List" pattern
 * used across the Zinga Admin dashboard.
 *
 * Responsibilities:
 * 1. Manage pagination & applied filters via `usePaginatedFilters`
 * 2. Render filter UI using `FiltersForm`
 * 3. Render list/table/cards using `ResponsiveDataList`
 * 4. Handle routing, CSV export, and refresh actions
 */

import { Store } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { PaginatedListPage } from '@/components/common/PaginatedListPage';
import { FiltersForm } from '@/components/common/FiltersForm';
import { ResponsiveDataList } from '@/components/common/ResponsiveDataList';

import { fetchServiceProviders } from '@/lib/api/serviceProviders';
import { ALL_CATEGORIES_VALUE } from '@/lib/constants/categories';
import { usePaginatedFilters } from '@/hooks/usePaginatedFilters';
import { exportToCSV } from '@/lib/utils/exportToCSV';

import { ServiceProvider } from '@/lib/types';
import { serviceProviderFiltersConfig, ZingaSPFilters } from '@/lib/filters/serviceProviders';
import { serviceProviderColumns } from '@/components/service-providers/serviceProviderColumns';
import { ServiceProviderCard } from '@/components/service-providers/ServiceProviderCard';
import { can, useCurrentUser } from '@/lib/auth';
import { useMemo } from 'react';
import { createServiceProviderRowActions } from '@/components/service-providers/serviceProviderRowActions';

/**
 * Default filter values
 *
 * ⚠️ Important:
 * - Defines the "no filters applied" state
 * - Used by FiltersForm to determine Reset / Apply button state
 * - Must stay aligned with backend expectations
 */
const defaultFilters: ZingaSPFilters = {
  store: '',
  owner: '',
  category: ALL_CATEGORIES_VALUE,
  location: '',
  registeredFrom: '',
  registeredTo: '',
};

export default function ZingaServiceProviders() {
  const router = useRouter();

  const { user } = useCurrentUser();

  /**
   * usePaginatedFilters encapsulates:
   * - Pagination state
   * - Draft vs applied filters separation
   * - React Query integration
   * - Page reset on filter changes
   *
   * NOTE:
   * - `filters` here represent APPLIED filters only
   * - Draft filter state lives inside FiltersForm
   */
  const { page, setPage, filters, applyFilters, resetFilters, query, totalPages, limit } =
    usePaginatedFilters<ZingaSPFilters, { providers: ServiceProvider[]; total: number }>({
      queryKey: 'service-providers',
      defaultFilters,
      fetchFn: fetchServiceProviders,
    });

  const providers = query.data?.providers ?? [];
  const total = query.data?.total ?? 0;

  const rowActions = useMemo(
    () =>
      createServiceProviderRowActions({
        currentRole: user?.role,

        onManage: (id) => {
          router.push(`/zinga-sp/${id}`);
        },

        onDelete: (id) => {
          console.log('Delete store:', id);
        },
      }),
    [user?.role, router],
  );

  const canSeeActions =
    can(user?.role, 'service-providers.enable') ||
    can(user?.role, 'service-providers.disable') ||
    can(user?.role, 'service-providers.delete');

  // Centralized error handling for fetch failures
  if (query.error instanceof Error) {
    return <div className="p-6 text-red-500">{query.error.message}</div>;
  }

  return (
    <PaginatedListPage<ServiceProvider, ZingaSPFilters>
      title="Service Providers"
      description="List of all service providers connected to Zinga app."
      icon={<Store className="h-5 w-5" />}
      /**
       * Pagination & dataset state
       */
      items={providers}
      total={total}
      page={page}
      totalPages={totalPages}
      limit={limit}
      loading={query.isFetching}
      /**
       * Applied filters
       *
       * Used for:
       * - Query key stability
       * - CSV export
       * - Showing active filters
       */
      filters={filters}
      /**
       * Filters UI
       *
       * FiltersForm:
       * - Maintains local draft state
       * - Enables Apply only when values change
       * - Shows Reset only after filters are applied
       */
      FiltersComponent={({ filters, onApply, onReset }) => (
        <FiltersForm
          fields={serviceProviderFiltersConfig}
          defaultFilters={defaultFilters}
          filters={filters}
          onApply={onApply}
          onReset={onReset}
        />
      )}
      /**
       * Filter actions
       * Delegated to usePaginatedFilters
       */
      onApplyFilters={applyFilters}
      onResetFilters={resetFilters}
      /**
       * List rendering
       *
       * ResponsiveDataList automatically switches:
       * - Table layout (desktop)
       * - Card layout (mobile)
       */
      ListComponent={({ items, loading, limit }) => (
        <ResponsiveDataList<ServiceProvider>
          items={items}
          loading={loading}
          limit={limit}
          rowKey={(sp) => sp.id}
          onRowClick={(sp) => router.push(`/zinga-sp/${sp.id}`)}
          columns={serviceProviderColumns}
          displayActions={canSeeActions}
          rowActions={canSeeActions ? rowActions : undefined}
          renderCard={(sp) => (
            <ServiceProviderCard
              provider={sp}
              rowActions={canSeeActions ? rowActions(sp) : undefined}
            />
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
      onCsvExport={() => exportToCSV(providers, 'zinga_service_providers.csv')}
    />
  );
}
