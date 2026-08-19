'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

import { ROLES, isRole, roleLabelMap, Role } from '@/lib/roles';
import { getInitials, avatarColor, formatDate, statusColorMap } from '@/lib/utils/common';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAdminUserDetails, updateAdminUser, updateAdminUserRole } from '@/lib/api/adminUsers';
import { Badge } from '@/components/ui/badge';
import { UserDoc } from '@/lib/types';
import { can, useCurrentUser } from '@/lib/auth';
import { EditUserDialog } from '@/components/users/EditUserDialog';
import { UserDetailsSkeleton } from '@/components/skeletons/UserDetailsSkeleton';
import { BackButton } from '@/components/common/BackButton';
import { AdminUserActionConfirmDialog } from '@/components/users/AdminUserActionConfirmDialog';
import { AdminUserAction, adminUserAction } from '@/lib/api/adminUserActions';

type PendingAction = {
  userId: string;
  action: AdminUserAction;
} | null;

export default function AccountLevelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { user: currentUser } = useCurrentUser();
  const canEditUser = can(currentUser?.role, 'users.edit');

  const [role, setRole] = useState<Role | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  /**
   * Fetch user
   */
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<UserDoc>({
    queryKey: ['admin-user', id],
    queryFn: () => fetchAdminUserDetails(id),
  });

  /**
   * Keep local role in sync with fetched user
   */
  useEffect(() => {
    if (user) setRole(user.role);
  }, [user]);

  const editMutation = useMutation({
    mutationFn: (data: { displayName: string; email: string }) => updateAdminUser(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditOpen(false);
    },
  });

  const adminActionMutation = useMutation<
    { success: true },
    Error,
    { userId: string; action: AdminUserAction }
  >({
    mutationFn: ({ userId, action }) => adminUserAction(userId, action),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setPendingAction(null);
    },

    onError: (err) => {
      alert(err.message);
    },
  });

  const detailActions = useMemo(() => {
    if (!user) return [];

    const actions: { label: string; action: AdminUserAction; destructive?: boolean }[] = [];

    if (user.status === 'invited') {
      actions.push({
        label: 'Cancel invitation',
        action: 'invite.cancel',
        destructive: true,
      });
    }

    if (user.status === 'active') {
      actions.push({
        label: 'Disable user',
        action: 'user.disable',
      });
    }

    if (user.status === 'disabled') {
      actions.push({
        label: 'Enable user',
        action: 'user.enable',
      });
    }

    actions.push({
      label: 'Delete user',
      action: 'user.delete',
      destructive: true,
    });

    return actions;
  }, [user]);

  /**
   * Update role mutation
   */
  const { mutate: saveRole, isPending } = useMutation({
    mutationFn: (role: Role) => updateAdminUserRole(id, role),

    // Optimistic UI
    onMutate: async (newRole) => {
      await queryClient.cancelQueries({ queryKey: ['admin-user', id] });

      const previous = queryClient.getQueryData<UserDoc>(['admin-user', id]);

      queryClient.setQueryData<UserDoc>(['admin-user', id], (old) =>
        old ? { ...old, role: newRole } : old,
      );

      return { previous };
    },

    onError: (_err, _role, context) => {
      queryClient.setQueryData(['admin-user', id], context?.previous);
      alert('Failed to update role');
    },

    onSuccess: () => {
      // Refresh list page cache
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
    },
  });

  function onRoleChange(value: string) {
    if (isRole(value)) setRole(value);
  }

  if (isLoading) return <UserDetailsSkeleton />;
  if (error) return <div className="py-6 text-red-500">User not found</div>;
  if (!user || !role) return <div className="py-6 text-red-500">User details not found</div>;

  return (
    <div>
      <BackButton />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full mt-3">
        {/* LEFT */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="flex flex-col items-center text-center space-y-3 pt-8">
              <div
                className={`w-20 h-20 rounded-full text-white flex items-center justify-center text-3xl font-semibold ${avatarColor(
                  user.displayName,
                )}`}
              >
                {getInitials(user.displayName)}
              </div>

              <div>
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-xl font-semibold">{user.displayName}</h2>

                  {canEditUser && (
                    <button
                      onClick={() => setEditOpen(true)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ✏️
                    </button>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>

              <Badge className={`capitalize ${statusColorMap[user.status]}`}>{user.status}</Badge>

              {canEditUser && (
                <div className="flex flex-row gap-2 w-full px-6 pb-6 items-center justify-center">
                  {detailActions.map((a) => (
                    <Button
                      key={a.action}
                      variant={a.destructive ? 'destructive' : 'outline'}
                      onClick={() =>
                        setPendingAction({ userId: user._id.toString(), action: a.action })
                      }
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>
              )}
            </CardHeader>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account details</CardTitle>
            </CardHeader>

            <CardContent className="divide-y">
              <div className="flex justify-between py-3">
                <span className="text-muted-foreground">Role</span>
                <Select value={role} onValueChange={onRoleChange} disabled={isPending}>
                  <SelectTrigger className="w-56">
                    <SelectValue>{roleLabelMap[role]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleLabelMap[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between py-3">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(user.createdAt)}</span>
              </div>

              {user.inviter && (
                <div className="flex justify-between py-3">
                  <span className="text-muted-foreground">Invited by</span>
                  <span>{user.inviter.displayName}</span>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => saveRole(role)} disabled={isPending || role === user.role}>
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving…
                    </span>
                  ) : (
                    'Save changes'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {pendingAction && (
          <AdminUserActionConfirmDialog
            open
            action={pendingAction.action}
            loading={adminActionMutation.isPending}
            onCancel={() => setPendingAction(null)}
            onConfirm={() => adminActionMutation.mutate(pendingAction)}
          />
        )}

        {canEditUser && user && (
          <EditUserDialog
            open={editOpen}
            onClose={() => setEditOpen(false)}
            user={user}
            onSave={(data) => editMutation.mutate(data)}
          />
        )}
      </div>
    </div>
  );
}
