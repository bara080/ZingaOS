'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  MessageSquareDot,
  User,
  Users,
  Globe,
  Plus,
  Trash2,
  ImageIcon,
  RefreshCw,
  Pencil,
  X,
  Check,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type PushNotificationJob = {
  _id: string;
  title: string;
  imageUrl?: string;
  message: string;
  targetType?: 'audience' | 'individual' | 'group';
  targetId?: string;
  audience?: 'customer' | 'service-provider' | 'both';
  totalTargets: number;
  delivered: number;
  failed: number;
  status: string;
  createdAt: string;
};

type NotificationGroup = {
  _id: string;
  name: string;
  uids: string[];
  createdAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusVariant(status: string): 'default' | 'destructive' | 'secondary' | 'outline' {
  if (status === 'sent') return 'default';
  if (status === 'partial') return 'secondary';
  return 'destructive';
}

function targetLabel(job: PushNotificationJob): string {
  if (job.targetType === 'individual') return `User: ${job.targetId || 'N/A'}`;
  if (job.targetType === 'group') return `Group: ${job.targetId || 'N/A'}`;
  return `Audience: ${job.audience || 'both'}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PushNotificationsPage = () => {
  // Send form
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [audience, setAudience] = useState<'customer' | 'service-provider' | 'both'>('both');
  const [targetType, setTargetType] = useState<'audience' | 'individual' | 'group'>('audience');
  const [userId, setUserId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [sending, setSending] = useState(false);

  // Status
  const [statusJobs, setStatusJobs] = useState<PushNotificationJob[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Groups
  const [groups, setGroups] = useState<NotificationGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupUids, setNewGroupUids] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<string | null>(null);

  // Edit state — tracks which group is being edited inline
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUids, setEditUids] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // ── Data fetchers ────────────────────────────────────────────────────────

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/push-notifications/status', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setStatusJobs(data.jobs || []);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/push-notifications/groups', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setGroups(data.groups || []);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    loadStatus();
    loadGroups();
  }, [loadStatus, loadGroups]);

  // Reset image preview error whenever URL changes
  useEffect(() => {
    setImagePreviewError(false);
  }, [imageUrl]);

  // ── Send ─────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    if (targetType === 'individual' && !userId.trim()) {
      toast.error('Please enter a User UID');
      return;
    }
    if (targetType === 'group' && !groupId.trim()) {
      toast.error('Please enter a Group Name');
      return;
    }

    setSending(true);
    try {
      const payload: Record<string, string> = { title, message, targetType };

      if (imageUrl.trim()) payload.imageUrl = imageUrl.trim();
      if (targetType === 'audience') payload.audience = audience;
      else if (targetType === 'individual') payload.userId = userId.trim();
      else if (targetType === 'group') payload.groupId = groupId.trim();

      const res = await fetch('/api/push-notifications/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send push notification');

      if (data.delivered === 0 && data.failed === 0) {
        toast.warning('No tokens found', { description: data.message });
      } else {
        toast.success('Push notification sent', {
          description: `${data.delivered} delivered · ${data.failed} failed`,
        });
      }

      setTitle('');
      setImageUrl('');
      setMessage('');
      setUserId('');
      setGroupId('');
      await loadStatus();
    } catch (error) {
      toast.error('Unable to send notification', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSending(false);
    }
  };

  // ── Groups ───────────────────────────────────────────────────────────────

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !newGroupUids.trim()) return;
    setCreatingGroup(true);
    try {
      const rawUids = newGroupUids
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean);
      const uids = [...new Set(rawUids)];
      const dupeCount = rawUids.length - uids.length;

      const res = await fetch('/api/push-notifications/groups', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim(), uids }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create group');

      toast.success(`Group "${newGroupName.trim()}" saved`, {
        description: `${uids.length} user${uids.length !== 1 ? 's' : ''} added${dupeCount > 0 ? ` · ${dupeCount} duplicate${dupeCount !== 1 ? 's' : ''} removed` : ''}`,
      });
      setNewGroupName('');
      setNewGroupUids('');
      await loadGroups();
    } catch (error) {
      toast.error('Error creating group', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleDeleteGroup = async (name: string) => {
    setDeletingGroup(name);
    try {
      const res = await fetch('/api/push-notifications/groups', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to delete group');
      toast.success(`Group "${name}" deleted`);
      if (editingGroupId === name) cancelEdit();
      await loadGroups();
    } catch {
      toast.error('Error deleting group');
    } finally {
      setDeletingGroup(null);
      setConfirmDeleteGroup(null);
    }
  };

  // ── Edit helpers ─────────────────────────────────────────────────────────

  const startEdit = (group: NotificationGroup) => {
    setEditingGroupId(group._id);
    setEditName(group.name);
    setEditUids(group.uids.join(', '));
  };

  const cancelEdit = () => {
    setEditingGroupId(null);
    setEditName('');
    setEditUids('');
  };

  const handleSaveEdit = async (originalName: string) => {
    const newName = editName.trim();
    const rawUids = editUids
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
    const uids = [...new Set(rawUids)];
    const dupeCount = rawUids.length - uids.length;

    if (!newName) {
      toast.error('Group name cannot be empty');
      return;
    }
    if (!uids.length) {
      toast.error('At least one UID is required');
      return;
    }

    setSavingEdit(true);
    try {
      // If the name changed we must delete the old group first, then upsert under the new name
      if (newName !== originalName) {
        const delRes = await fetch('/api/push-notifications/groups', {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: originalName }),
        });
        if (!delRes.ok) throw new Error('Failed to remove old group during rename');
      }

      const res = await fetch('/api/push-notifications/groups', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, uids }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update group');

      toast.success(`Group "${newName}" updated`, {
        description: `${uids.length} user${uids.length !== 1 ? 's' : ''}${dupeCount > 0 ? ` · ${dupeCount} duplicate${dupeCount !== 1 ? 's' : ''} removed` : ''}`,
      });
      cancelEdit();
      await loadGroups();
    } catch (error) {
      toast.error('Error updating group', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquareDot className="h-5 w-5" />
        <h1 className="text-2xl font-semibold">Push Notifications</h1>
      </div>

      {/* ── Send Card ──────────────────────────────────────────────────────── */}
      <Card className="bg-primary-foreground">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Send push notification</CardTitle>
          <CardDescription>Target specific users, groups, or broad segments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Target type */}
          <div className="flex flex-row items-center gap-3">
            <label className="text-sm font-medium shrink-0">Target Type</label>
            <Tabs
              value={targetType}
              onValueChange={(v) => setTargetType(v as 'audience' | 'individual' | 'group')}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="audience" className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4" /> Audience
                </TabsTrigger>
                <TabsTrigger value="individual" className="flex items-center gap-1.5">
                  <User className="h-4 w-4" /> Individual
                </TabsTrigger>
                <TabsTrigger value="group" className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> Group
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Target-specific field + title — side by side on md+ */}
          <div className="grid gap-4 md:grid-cols-2">
            {targetType === 'audience' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Broad Audience</label>
                <select
                  value={audience}
                  onChange={(e) =>
                    setAudience(e.target.value as 'customer' | 'service-provider' | 'both')
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="both">Both (Customers + Service Providers)</option>
                  <option value="customer">Customers only</option>
                  <option value="service-provider">Service Providers only</option>
                </select>
              </div>
            )}

            {targetType === 'individual' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">User UID</label>
                <Input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g. user_123abc"
                />
              </div>
            )}

            {targetType === 'group' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Group Name</label>
                {groups.length > 0 ? (
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">— Select a group —</option>
                    {groups.map((g) => (
                      <option key={g._id} value={g.name}>
                        {g.name} ({g.uids.length} users)
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    placeholder="e.g. beta-testers"
                  />
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification Title"
              />
            </div>
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              Image URL
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/banner.png"
            />
            {imageUrl.trim() && !imagePreviewError && (
              <div className="mt-2 rounded-md border overflow-hidden w-full max-w-sm h-36 bg-muted">
                <img
                  src={imageUrl}
                  alt="Notification image preview"
                  className="h-full w-full object-cover"
                  onError={() => setImagePreviewError(true)}
                />
              </div>
            )}
            {imageUrl.trim() && imagePreviewError && (
              <p className="text-xs text-destructive">
                Could not load image — double-check the URL is publicly accessible.
              </p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Share the message users should receive on their phone."
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={
              sending ||
              !title.trim() ||
              !message.trim() ||
              (targetType === 'individual' && !userId.trim()) ||
              (targetType === 'group' && !groupId.trim())
            }
          >
            {sending ? 'Sending…' : 'Send push notification'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Manage Groups ──────────────────────────────────────────────────── */}
      <Card className="bg-primary-foreground">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Manage Groups</CardTitle>
          <CardDescription>
            Create named collections of users to target for specific notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create form */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Group Name</label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. VIP Customers"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">User UIDs (comma-separated)</label>
              <Input
                value={newGroupUids}
                onChange={(e) => setNewGroupUids(e.target.value)}
                placeholder="uid1, uid2, uid3"
              />
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={handleCreateGroup}
            disabled={creatingGroup || !newGroupName.trim() || !newGroupUids.trim()}
          >
            <Plus className="h-4 w-4 mr-2" />
            {creatingGroup ? 'Saving…' : 'Create Group'}
          </Button>

          {/* Existing groups */}
          {groups.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium text-muted-foreground">Existing groups</p>
              <div className="space-y-2">
                {groups.map((g) =>
                  editingGroupId === g._id ? (
                    /* ── Inline edit row ── */
                    <div
                      key={g._id}
                      className="rounded-lg border border-ring/50 bg-muted/40 px-4 py-3 space-y-3"
                    >
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">
                            Group Name
                          </label>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Group name"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">
                            User UIDs (comma-separated)
                          </label>
                          <Input
                            value={editUids}
                            onChange={(e) => setEditUids(e.target.value)}
                            placeholder="uid1, uid2, uid3"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(g.name)}
                          disabled={savingEdit || !editName.trim() || !editUids.trim()}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          {savingEdit ? 'Saving…' : 'Save'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEdit}
                          disabled={savingEdit}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ── Normal row ── */
                    <div
                      key={g._id}
                      className="flex items-center justify-between rounded-lg border px-4 py-3"
                    >
                      <div>
                        <span className="font-medium text-sm">{g.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {g.uids.length} user{g.uids.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Edit button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(g)}
                          disabled={!!editingGroupId || deletingGroup === g.name}
                          title="Edit group"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={deletingGroup === g.name || !!editingGroupId}
                          onClick={() => setConfirmDeleteGroup(g.name)}
                          title="Delete group"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Delivery Status ────────────────────────────────────────────────── */}
      <Card className="bg-primary-foreground">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Delivery status</CardTitle>
            <CardDescription>Latest sends, delivered count, and failures.</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadStatus}
            disabled={loadingStatus}
            className="shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loadingStatus ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {statusJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No delivery jobs have been sent yet.</p>
            ) : (
              statusJobs.map((job) => (
                <div key={String(job._id)} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      {job.imageUrl && (
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded border bg-muted">
                          <img
                            src={job.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{job.title}</p>
                        <p className="text-sm text-muted-foreground">{job.message}</p>
                      </div>
                    </div>
                    <Badge variant={statusVariant(job.status)} className="shrink-0">
                      {job.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="capitalize font-semibold text-primary">
                      {targetLabel(job)}
                    </span>
                    <span>Targeted: {job.totalTargets}</span>
                    <span>Delivered: {job.delivered}</span>
                    <span>Failed: {job.failed}</span>
                    <span>{new Date(job.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mb-20" />

      {/* ── Delete confirmation dialog ─────────────────────────────────────── */}
      <AlertDialog
        open={!!confirmDeleteGroup}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteGroup(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group &quot;{confirmDeleteGroup}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the group and all its members. Any scheduled or future
              notifications targeting this group will no longer reach its users. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingGroup}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={!!deletingGroup}
              onClick={() => confirmDeleteGroup && handleDeleteGroup(confirmDeleteGroup)}
            >
              {deletingGroup ? 'Deleting…' : 'Yes, delete group'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PushNotificationsPage;
