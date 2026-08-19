'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown } from 'lucide-react';

const TABS = ['Today', 'This Week', 'This Month', 'This Year'] as const;
type Tab = (typeof TABS)[number];

const RANGE_MAP: Record<Tab, string> = {
  Today: 'today',
  'This Week': 'week',
  'This Month': 'month',
  'This Year': 'year',
};

export default function DashboardTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const active = useMemo<Tab>(() => {
    const range = searchParams.get('range');
    const match = TABS.find((tab) => RANGE_MAP[tab] === range);
    return match ?? 'Today';
  }, [searchParams]);

  const onSelect = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', RANGE_MAP[tab]);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="w-full mb-4">
      {/* Mobile */}
      <div className="block sm:hidden w-full">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span>{active}</span>
              <ChevronDown className="h-4 w-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            sideOffset={4}
            style={{ width: 'var(--radix-dropdown-menu-trigger-width)' }}
          >
            {TABS.map((tab) => (
              <DropdownMenuItem
                key={tab}
                onClick={() => onSelect(tab)}
                className="flex w-full items-center justify-between px-3 py-2"
              >
                <span>{tab}</span>
                {tab === active && <Check className="h-4 w-4 opacity-70" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop */}
      <div className="hidden sm:inline-flex gap-2 rounded-2xl bg-primary-foreground p-2">
        {TABS.map((tab) => (
          <Button
            key={tab}
            onClick={() => onSelect(tab)}
            variant={tab === active ? 'default' : 'ghost'}
            size="sm"
            className="rounded-full"
            aria-pressed={tab === active}
          >
            {tab}
          </Button>
        ))}
      </div>
    </div>
  );
}
