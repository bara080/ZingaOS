import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type FetchFn<TFilters, TResult> = (
  page: number,
  limit: number,
  filters: TFilters,
) => Promise<TResult>;

type Options<TFilters, TResult> = {
  queryKey: string;
  limit?: number;
  defaultFilters: TFilters;
  fetchFn: FetchFn<TFilters, TResult>;
};

export function usePaginatedFilters<TFilters, TResult extends { total: number }>({
  queryKey,
  limit = 10,
  defaultFilters,
  fetchFn,
}: Options<TFilters, TResult>) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<TFilters>(defaultFilters);

  const queryClient = useQueryClient();

  const rqKey = useMemo(() => [queryKey, page, appliedFilters], [queryKey, page, appliedFilters]);

  const query = useQuery({
    queryKey: rqKey,
    queryFn: () => fetchFn(page, limit, appliedFilters),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  const totalPages = query.data ? Math.ceil(query.data.total / limit) : 1;

  /* Prefetch next page */
  useEffect(() => {
    if (page < totalPages) {
      queryClient.prefetchQuery({
        queryKey: [queryKey, page + 1, appliedFilters],
        queryFn: () => fetchFn(page + 1, limit, appliedFilters),
      });
    }
  }, [page, appliedFilters, totalPages, queryClient, queryKey, limit, fetchFn]);

  return {
    page,
    setPage,

    // Draft filters (UI state)
    filters,
    setFilters,

    // Applied filters (query state)
    appliedFilters,

    applyFilters: (nextFilters: TFilters) => {
      setPage(1);
      setFilters(nextFilters); // keep UI in sync
      setAppliedFilters(nextFilters); // ✅ atomic update
    },

    resetFilters: () => {
      setPage(1);
      setFilters(defaultFilters);
      setAppliedFilters(defaultFilters);
    },

    query,
    totalPages,
    limit,
  };
}
