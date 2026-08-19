'use client';

/**
 * Account Levels – Admin Users List Page
 *
 * This page follows the standard "Paginated + Filtered List" pattern
 * used across the Zinga Admin dashboard.
 *
 * Responsibilities:
 * 1. Fetch admin users with pagination & filters
 * 2. Manage applied filter state via `usePaginatedFilters`
 * 3. Render filters, list, pagination, and page actions
 * 4. Handle permissions (RBAC) for creating users
 * 5. Support CSV export and manual refresh
 */

import { Plus, ShieldUser } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { PaginatedListPage } from '@/components/common/PaginatedListPage';
import { ResponsiveDataList } from '@/components/common/ResponsiveDataList';
import { FiltersForm } from '@/components/common/FiltersForm';
import { AdminUserCard } from '@/components/users/AdminUserCard';
import { InviteUserDialog } from '@/components/users/InviteUserDialog';

import { AdminUserListItem } from '@/lib/types';
import { fetchAdminUsers } from '@/lib/api/adminUsers';
import { ALL_ROLES_VALUE } from '@/lib/roles';
import { usePaginatedFilters } from '@/hooks/usePaginatedFilters';
import { exportToCSV } from '@/lib/utils/exportToCSV';
import { adminUserFiltersConfig, AdminUsersFilters } from '@/lib/filters/adminUsers';
import { adminUserColumns } from '@/components/users/adminUserColumns';
import { can, useCurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminUserAction, adminUserAction } from '@/lib/api/adminUserActions';
import { AdminUserActionConfirmDialog } from '@/components/users/AdminUserActionConfirmDialog';
import { createAdminUserRowActions } from '@/components/users/adminUserRowActions';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type PendingActionPayload = {
  userId: string;
  action: AdminUserAction;
};

type PendingAction = PendingActionPayload | null;

/**
 * Default filter values
 *
 * Purpose:
 * - Represents the "no filters applied" state
 * - Used by FiltersForm to compute dirty / applied state
 * - Must align with backend query expectations
 */
const defaultFilters: AdminUsersFilters = {
  name: '',
  email: '',
  role: ALL_ROLES_VALUE,
  invitedby: '',
  registeredFrom: '',
  registeredTo: '',
};

export default function AccountLevelsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  /**
   * Current authenticated admin user
   *
   * Used for:
   * - Permission checks (RBAC)
   * - Conditional rendering of "Add User" action
   */
  const { user, loading: userLoading } = useCurrentUser();

  /**
   * Invite User dialog state
   */
  const [inviteOpen, setInviteOpen] = useState(false);

  /**
   * Pending destructive action state
   *
   * This drives the confirmation dialog lifecycle.
   */
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  /**
   * usePaginatedFilters manages:
   * - Pagination state
   * - Applied filters (query state)
   * - Draft filters (via FiltersForm)
   * - React Query integration
   *
   * NOTE:
   * - `filters` here are APPLIED filters only
   * - Draft filters live inside FiltersForm
   */
  const { page, setPage, filters, applyFilters, resetFilters, query, totalPages, limit } =
    usePaginatedFilters<AdminUsersFilters, { users: AdminUserListItem[]; total: number }>({
      queryKey: 'users',
      defaultFilters,
      fetchFn: fetchAdminUsers,
    });

  const users = query.data?.users ?? [];
  const total = query.data?.total ?? 0;

  const adminUserActionMutation = useMutation<
    { success: true }, // mutation result
    Error, // error
    PendingActionPayload // variables
  >({
    mutationFn: ({ userId, action }) => adminUserAction(userId, action),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setPendingAction(null);
    },

    onError: (error) => {
      console.error(error);
      alert(error.message);
    },
  });

  /**
   * Row action request handler
   *
   * Acts as the single entry point for:
   * - Cancel invite
   * - Disable user
   * - Delete user
   *
   * Keeps dialog state management centralized.
   */
  const requestAction = useCallback((userId: string, action: AdminUserAction) => {
    setPendingAction({ userId, action });
  }, []);

  /**
   * Executes the currently pending action
   * after user confirmation.
   */
  const confirmPendingAction = useCallback(() => {
    if (!pendingAction) return;

    adminUserActionMutation.mutate(pendingAction);
  }, [pendingAction, adminUserActionMutation]);

  const cancelPendingAction = useCallback(() => {
    setPendingAction(null);
  }, []);

  /**
   * Memoized row actions factory
   *
   * This ensures:
   * - Stable references
   * - No unnecessary re-renders
   * - Clean separation of concerns
   */
  const rowActions = useMemo(
    () =>
      createAdminUserRowActions({
        onEdit: (id) => router.push(`/admin-users/${id}`),
        onRequestAction: requestAction,
      }),
    [router, requestAction],
  );

  // Prevent rendering until auth state is resolved
  if (userLoading) return null;

  // Centralized fetch error handling
  if (query.error instanceof Error) {
    return <div className="p-6 text-red-500">{query.error.message}</div>;
  }

  return (
    <>
      <PaginatedListPage<AdminUserListItem, AdminUsersFilters>
        title="Admin Users"
        description="List of all admin users connected to Zinga Admin."
        icon={<ShieldUser className="h-5 w-5" />}
        /**
         * Page-level actions
         *
         * "Add User" button is rendered only if:
         * - Current admin has `users.create` permission
         */
        pageActions={
          can(user?.role, 'users.create') && (
            <Button onClick={() => setInviteOpen(true)}>
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          )
        }
        /**
         * Pagination & dataset state
         */
        items={users}
        total={total}
        page={page}
        totalPages={totalPages}
        limit={limit}
        loading={query.isFetching}
        /**
         * Applied filters
         *
         * Used for:
         * - Stable query keys
         * - CSV export
         * - UI consistency
         */
        filters={filters}
        /**
         * Filters UI
         *
         * FiltersForm:
         * - Keeps local draft state
         * - Enables Apply only when dirty
         * - Shows Reset only after filters applied
         */
        FiltersComponent={({ filters, onApply, onReset }) => (
          <FiltersForm
            fields={adminUserFiltersConfig}
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
         * Display Actions
         */
        displayActions={true}
        rowActions={rowActions}
        /**
         * List rendering
         *
         * ResponsiveDataList handles:
         * - Table layout (desktop)
         * - Card layout (mobile)
         */
        ListComponent={({ items, loading, limit, displayActions, rowActions }) => (
          <ResponsiveDataList<AdminUserListItem>
            items={items}
            loading={loading}
            limit={limit}
            rowKey={(u) => u._id}
            onRowClick={(u) => router.push(`/admin-users/${u._id}`)}
            columns={adminUserColumns}
            displayActions={displayActions}
            rowActions={rowActions}
            renderCard={(u) => <AdminUserCard user={u} rowActions={rowActions?.(u)} />}
            tableSkeleton={{ withAvatar: true }}
            cardSkeleton={{ avatar: true, lines: 2 }}
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
        onCsvExport={() => exportToCSV(users, 'zinga_admin_users.csv')}
      />

      {/* /**
       * Invite User Dialog
       *
       * On successful invite:
       * - Refetch list to reflect newly invited user
       */}
      <InviteUserDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={() => query.refetch()}
      />

      {pendingAction && (
        <AdminUserActionConfirmDialog
          open
          action={pendingAction.action}
          loading={adminUserActionMutation.isPending}
          onCancel={cancelPendingAction}
          onConfirm={confirmPendingAction}
        />
      )}
    </>
  );
}
