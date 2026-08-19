'use client';

/**
 * Zinga Bookings – List Page
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

import { CalendarDays } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { PaginatedListPage } from '@/components/common/PaginatedListPage';
import { FiltersForm } from '@/components/common/FiltersForm';
import { ResponsiveDataList } from '@/components/common/ResponsiveDataList';

import { usePaginatedFilters } from '@/hooks/usePaginatedFilters';
import { fetchServiceRequests } from '@/lib/api/serviceRequests';
import { exportToCSV } from '@/lib/utils/exportToCSV';

import { bookingColumns } from '@/components/bookings/bookingColumns';
import { ServiceRequestListItem } from '@/lib/types/serviceRequest';
import { BookingCard } from '@/components/bookings/BookingCard';
import { BookingFilters, bookingFiltersConfig } from '@/lib/filters/bookings';
import { ALL_CATEGORIES_VALUE } from '@/lib/constants/categories';

/**
 * Default filter values
 *
 * ⚠️ Important:
 * - Defines the "no filters applied" state
 * - Used by FiltersForm to determine Reset / Apply button state
 * - Must stay aligned with backend expectations
 */
const defaultFilters: BookingFilters = {
  bookingId: '',
  storeId: '',
  status: '',
  category: ALL_CATEGORIES_VALUE,
  createdFrom: '',
  createdTo: '',
};

export default function BookingsListPage() {
  const router = useRouter();

  /**
   * usePaginatedFilters encapsulates:
   * - Pagination state
   * - Draft vs applied filters separation
   * - React Query integration
   * - Page reset on filter changes
   */
  const { page, setPage, filters, applyFilters, resetFilters, query, totalPages, limit } =
    usePaginatedFilters<BookingFilters, { bookings: ServiceRequestListItem[]; total: number }>({
      queryKey: 'service-requests',
      defaultFilters,
      fetchFn: fetchServiceRequests,
    });

  const bookings = query.data?.bookings ?? [];
  const total = query.data?.total ?? 0;

  // Centralized error handling
  if (query.error instanceof Error) {
    return <div className="p-6 text-red-500">{query.error.message}</div>;
  }

  return (
    <PaginatedListPage<ServiceRequestListItem, BookingFilters>
      title="Bookings"
      description="List of all bookings connected to Zinga app."
      icon={<CalendarDays className="h-5 w-5" />}
      /**
       * Pagination & dataset state
       */
      items={bookings}
      total={total}
      page={page}
      totalPages={totalPages}
      limit={limit}
      loading={query.isFetching}
      /**
       * Applied filters
       */
      filters={filters}
      /**
       * Filters UI
       */
      FiltersComponent={({ filters, onApply, onReset }) => (
        <FiltersForm
          fields={bookingFiltersConfig}
          defaultFilters={defaultFilters}
          filters={filters}
          onApply={onApply}
          onReset={onReset}
        />
      )}
      /**
       * Filter actions
       */
      onApplyFilters={applyFilters}
      onResetFilters={resetFilters}
      /**
       * List rendering
       */
      ListComponent={({ items, loading, limit }) => (
        <ResponsiveDataList<ServiceRequestListItem>
          items={items}
          loading={loading}
          limit={limit}
          rowKey={(b) => b.id}
          onRowClick={(b) => router.push(`/bookings/${b.id}`)}
          columns={bookingColumns}
          renderCard={(booking) => <BookingCard booking={booking} />}
          tableSkeleton={{ columns: bookingColumns.length }}
          cardSkeleton={{ lines: 4 }}
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
      onCsvExport={() => exportToCSV(bookings, 'zinga_bookings.csv')}
    />
  );
}
