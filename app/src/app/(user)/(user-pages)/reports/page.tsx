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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Download,
  Filter,
  FileText,
  RefreshCcw,
  BarChart3,
  Percent,
  Users,
  Handshake,
} from 'lucide-react';

/* --------------------------- sample data --------------------------- */
type ReportRow = {
  date: string; // YYYY-MM-DD
  segment: 'All' | 'Customers' | 'ServiceProviders';
  channel: 'Organic' | 'Paid' | 'Referral' | 'Direct';
  revenue: number;
  bookings: number;
  activeUsers: number;
  disputes: number;
  refunds: number;
};

const RAW: ReportRow[] = [
  {
    date: '2025-09-01',
    segment: 'All',
    channel: 'Organic',
    revenue: 15890,
    bookings: 610,
    activeUsers: 4550,
    disputes: 8,
    refunds: 12,
  },
  {
    date: '2025-09-02',
    segment: 'Customers',
    channel: 'Paid',
    revenue: 19820,
    bookings: 780,
    activeUsers: 4920,
    disputes: 10,
    refunds: 15,
  },
  {
    date: '2025-09-03',
    segment: 'ServiceProviders',
    channel: 'Referral',
    revenue: 13200,
    bookings: 520,
    activeUsers: 3180,
    disputes: 4,
    refunds: 6,
  },
  {
    date: '2025-09-04',
    segment: 'All',
    channel: 'Direct',
    revenue: 22100,
    bookings: 860,
    activeUsers: 5310,
    disputes: 6,
    refunds: 9,
  },
  {
    date: '2025-09-05',
    segment: 'Customers',
    channel: 'Organic',
    revenue: 17640,
    bookings: 690,
    activeUsers: 4780,
    disputes: 7,
    refunds: 10,
  },
  {
    date: '2025-09-06',
    segment: 'ServiceProviders',
    channel: 'Paid',
    revenue: 12040,
    bookings: 460,
    activeUsers: 3050,
    disputes: 3,
    refunds: 5,
  },
  {
    date: '2025-09-07',
    segment: 'All',
    channel: 'Referral',
    revenue: 24550,
    bookings: 910,
    activeUsers: 5590,
    disputes: 9,
    refunds: 11,
  },
];

/* --------------------------- utils --------------------------- */
const money = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
const pct = (n: number, d: number) => (d ? (n / d) * 100 : 0);

function csvDownload(rows: ReportRow[], filename = 'report.csv') {
  const headers = Object.keys(rows[0] ?? {}).join(',');
  const lines = rows.map((r) =>
    [
      r.date,
      r.segment,
      r.channel,
      r.revenue,
      r.bookings,
      r.activeUsers,
      r.disputes,
      r.refunds,
    ].join(','),
  );
  const csv = [headers, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* --------------------------- page --------------------------- */
export default function ReportsPage() {
  const [from, setFrom] = useState('2025-09-01');
  const [to, setTo] = useState('2025-09-30');
  const [segment, setSegment] = useState<ReportRow['segment'] | 'Any'>('Any');
  const [channel, setChannel] = useState<ReportRow['channel'] | 'Any'>('Any');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    return RAW.filter((r) => {
      const inDate = (!from || r.date >= from) && (!to || r.date <= to);
      const inSeg = segment === 'Any' ? true : r.segment === segment;
      const inCh = channel === 'Any' ? true : r.channel === channel;
      const text = q.trim().toLowerCase();
      const inQ = !text || Object.values(r).join(' ').toLowerCase().includes(text);
      return inDate && inSeg && inCh && inQ;
    });
  }, [from, to, segment, channel, q]);

  const totals = useMemo(() => {
    const sum = filtered.reduce(
      (acc, r) => {
        acc.revenue += r.revenue;
        acc.bookings += r.bookings;
        acc.activeUsers += r.activeUsers;
        acc.disputes += r.disputes;
        acc.refunds += r.refunds;
        return acc;
      },
      { revenue: 0, bookings: 0, activeUsers: 0, disputes: 0, refunds: 0 },
    );
    const disputeRate = pct(sum.disputes, sum.bookings);
    const refundRate = pct(sum.refunds, sum.bookings);
    const arpu = sum.activeUsers ? sum.revenue / sum.activeUsers : 0;
    const conv = pct(sum.bookings, sum.activeUsers);
    return { ...sum, disputeRate, refundRate, arpu, conv };
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Exportable performance reports with filters.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => csvDownload(filtered)}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="default" onClick={() => window.print()}>
            <FileText className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* filters */}
      <Card className="bg-primary-foreground">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
          <CardDescription>Choose a window, segment, and channel.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Segment</Label>
            <Select
              value={segment}
              onValueChange={(v: ReportRow['segment'] | 'Any') => setSegment(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Any">Any</SelectItem>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Customers">Customers</SelectItem>
                <SelectItem value="Providers">Providers</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Channel</Label>
            <Select
              value={channel}
              onValueChange={(v: ReportRow['channel'] | 'Any') => setChannel(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Any">Any</SelectItem>
                <SelectItem value="Organic">Organic</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="Direct">Direct</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q">Search</Label>
            <Input
              id="q"
              placeholder="Search text…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setFrom('2025-09-01');
              setTo('2025-09-30');
              setSegment('Any');
              setChannel('Any');
              setQ('');
            }}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </CardFooter>
      </Card>

      {/* kpi summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{money(totals.revenue)}</CardContent>
          <CardFooter className="text-xs text-muted-foreground">Total within filters</CardFooter>
        </Card>
        <Card className="bg-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Handshake className="h-4 w-4" />
              Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {totals.bookings.toLocaleString()}
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Conversion {totals.conv.toFixed(2)}&#37;
          </CardFooter>
        </Card>
        <Card className="bg-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {totals.activeUsers.toLocaleString()}
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            ARPU {money(totals.arpu)}
          </CardFooter>
        </Card>
        <Card className="bg-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Quality
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {totals.disputeRate.toFixed(2)}&#37;
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Refunds {totals.refundRate.toFixed(2)}&#37;
          </CardFooter>
        </Card>
      </div>

      {/* table */}
      <Card className="bg-primary-foreground">
        <CardHeader>
          <CardTitle>Detail</CardTitle>
          <CardDescription>Daily breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead className="text-right">Active Users</TableHead>
                <TableHead className="text-right">Disputes</TableHead>
                <TableHead className="text-right">Refunds</TableHead>
                <TableHead className="text-right">Dispute Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const disputeRate = pct(r.disputes, r.bookings);
                return (
                  <TableRow key={`${r.date}-${r.segment}-${r.channel}`}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>{r.segment}</TableCell>
                    <TableCell>{r.channel}</TableCell>
                    <TableCell className="text-right">{money(r.revenue)}</TableCell>
                    <TableCell className="text-right">{r.bookings.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{r.activeUsers.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{r.disputes}</TableCell>
                    <TableCell className="text-right">{r.refunds}</TableCell>
                    <TableCell className="text-right">{disputeRate.toFixed(2)}&#37;</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          {filtered.length.toLocaleString()} rows • Export CSV for further analysis.
        </CardFooter>
      </Card>
    </div>
  );
}
