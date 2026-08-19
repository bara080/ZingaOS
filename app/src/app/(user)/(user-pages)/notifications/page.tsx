'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Bell,
  MailOpen,
  Mail,
  Info,
  AlertTriangle,
  CheckCircle2,
  Filter,
  MoreHorizontal,
  Trash2,
  CheckCheck,
} from 'lucide-react';

type NType = 'info' | 'warning' | 'success';
type NItem = {
  id: string;
  type: NType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  channel: 'Email' | 'Push' | 'In-App';
  entity?: string;
};

const RAW: NItem[] = [
  {
    id: 'n1',
    type: 'info',
    title: 'New Feature',
    message: 'Advanced filters are live.',
    createdAt: '2025-09-07T09:12:00Z',
    read: false,
    channel: 'In-App',
  },
  {
    id: 'n2',
    type: 'warning',
    title: 'High Disputes',
    message: 'Disputes crossed 1% today.',
    createdAt: '2025-09-06T16:55:00Z',
    read: false,
    channel: 'Email',
    entity: 'rep-9281',
  },
  {
    id: 'n3',
    type: 'success',
    title: 'Payout Sent',
    message: 'Weekly payout completed.',
    createdAt: '2025-09-05T21:10:00Z',
    read: true,
    channel: 'Push',
  },
  {
    id: 'n4',
    type: 'info',
    title: 'Booking Update',
    message: 'Booking #A412 confirmed.',
    createdAt: '2025-09-04T12:30:00Z',
    read: true,
    channel: 'In-App',
    entity: 'A412',
  },
  {
    id: 'n5',
    type: 'warning',
    title: 'Churn Spike',
    message: 'Churn reached 3% (30d).',
    createdAt: '2025-09-03T08:05:00Z',
    read: false,
    channel: 'Email',
  },
  {
    id: 'n6',
    type: 'success',
    title: 'Migration Done',
    message: 'Analytics index rebuilt.',
    createdAt: '2025-09-02T10:00:00Z',
    read: true,
    channel: 'In-App',
  },
];

const IconByType: Record<NType, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
};
const channelBadge = (c: NItem['channel']) => <Badge variant="secondary">{c}</Badge>;
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export default function NotificationsPage() {
  const [tab, setTab] = useState<'all' | 'unread' | 'alerts' | 'system'>('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    let out = RAW.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    if (tab === 'unread') out = out.filter((n) => !n.read);
    if (tab === 'alerts') out = out.filter((n) => n.type === 'warning');
    if (tab === 'system') out = out.filter((n) => n.type !== 'warning');
    if (q.trim()) {
      const t = q.toLowerCase();
      out = out.filter((n) =>
        `${n.title} ${n.message} ${n.channel} ${n.entity ?? ''}`.toLowerCase().includes(t),
      );
    }
    return out;
  }, [tab, q]);

  const allSelected = filtered.length > 0 && filtered.every((n) => selected[n.id]);
  const someSelected = filtered.some((n) => selected[n.id]);

  const bulkMarkRead = (read: boolean) => {
    const ids = filtered.filter((n) => selected[n.id]).map((n) => n.id);
    if (!ids.length) return;
    toast.success(read ? 'Marked as read' : 'Marked as unread', {
      description: `${ids.length} notification(s)`,
    });
    setSelected({});
  };

  const bulkDelete = () => {
    const count = filtered.filter((n) => selected[n.id]).length;
    if (!count) return;
    toast.success('Deleted', { description: `${count} notification(s)` });
    setSelected({});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h1 className="text-2xl font-semibold">Notifications</h1>
        </div>
        <Input
          placeholder="Search notifications…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-65"
        />
      </div>

      <Card className="bg-primary-foreground">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Inbox</CardTitle>
          <CardDescription>Filter, scan, and take bulk actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Tabs
                value={tab}
                onValueChange={(v: string) => setTab(v as 'all' | 'unread' | 'alerts' | 'system')}
              >
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="unread">Unread</TabsTrigger>
                  <TabsTrigger value="alerts">Alerts</TabsTrigger>
                  <TabsTrigger value="system">System</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkMarkRead(true)}
                  disabled={!someSelected}
                >
                  <MailOpen className="h-4 w-4 mr-2" />
                  Mark read
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkMarkRead(false)}
                  disabled={!someSelected}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Mark unread
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={bulkDelete}
                  disabled={!someSelected}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            <Separator />

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(v) => {
                        const next: Record<string, boolean> = {};
                        if (v) filtered.forEach((n) => (next[n.id] = true));
                        setSelected(v ? next : {});
                      }}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Ref</TableHead>
                  <TableHead className="text-right">When</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((n) => {
                  const Icon = IconByType[n.type];
                  return (
                    <TableRow key={n.id} className={!n.read ? 'bg-muted/40' : ''}>
                      <TableCell className="align-middle">
                        <Checkbox
                          checked={!!selected[n.id]}
                          onCheckedChange={(v) => setSelected((s) => ({ ...s, [n.id]: !!v }))}
                          aria-label={`Select ${n.title}`}
                        />
                      </TableCell>
                      <TableCell className="align-middle">
                        <Badge
                          variant={
                            n.type === 'warning'
                              ? 'destructive'
                              : n.type === 'success'
                                ? 'default'
                                : 'secondary'
                          }
                          className="inline-flex items-center gap-1"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {n.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{n.title}</TableCell>
                      <TableCell className="text-muted-foreground">{n.message}</TableCell>
                      <TableCell>{channelBadge(n.channel)}</TableCell>
                      <TableCell>{n.entity ?? '-'}</TableCell>
                      <TableCell className="text-right">{fmtTime(n.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={() => toast('Opened', { description: n.title })}
                            >
                              Open
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                toast.success(n.read ? 'Marked unread' : 'Marked read')
                              }
                            >
                              {n.read ? (
                                <Mail className="h-3.5 w-3.5 mr-2" />
                              ) : (
                                <MailOpen className="h-3.5 w-3.5 mr-2" />
                              )}
                              {n.read ? 'Mark unread' : 'Mark read'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => toast.success('Deleted')}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        <CardFooter className="text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" />
            {filtered.length} notifications
          </div>
          <div className="flex items-center gap-2">
            {someSelected ? (
              <Badge variant="outline" className="inline-flex items-center gap-1">
                <CheckCheck className="h-3.5 w-3.5" />
                {Object.values(selected).filter(Boolean).length} selected
              </Badge>
            ) : null}
          </div>
        </CardFooter>
      </Card>
      <div className="mb-20"></div>
    </div>
  );
}
