'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  Fingerprint,
  ShieldCheck,
  SquareDashedBottomCode,
  CircleUserRound,
  UserRound,
  Store,
  ListCollapse,
  CalendarCheck,
  MessagesSquare,
  BellDot,
  WalletMinimal,
} from 'lucide-react';
import { cn } from '@/lib/utils/common'; // make sure you have this utility (shadcn’s cn merge)
import BrandingLogo from '../BrandingLogo';

const navGroups = [
  {
    label: 'Getting Started',
    items: [
      { title: 'Overview', url: '/api-doc', icon: SquareDashedBottomCode },
      { title: 'Auth', url: '/api-doc/auth', icon: Fingerprint },
      { title: 'Middleware', url: '/api-doc/middleware', icon: ShieldCheck },
    ],
  },
  {
    label: 'Users & Roles',
    items: [
      { title: 'User', url: '/api-doc/user', icon: CircleUserRound },
      { title: 'Customer', url: '/api-doc/customer', icon: UserRound },
      { title: 'Service Provider', url: '/api-doc/service-provider', icon: Store },
    ],
  },
  {
    label: 'Platform Features',
    items: [
      { title: 'Services', url: '/api-doc/services', icon: ListCollapse },
      { title: 'Bookings', url: '/api-doc/bookings', icon: CalendarCheck },
      { title: 'Chats', url: '/api-doc/chats', icon: MessagesSquare },
    ],
  },
  {
    label: 'Finance & Ops',
    items: [
      { title: 'Wallet', url: '/api-doc/wallet', icon: WalletMinimal },
      { title: 'Notifications', url: '/api-doc/notifications', icon: BellDot },
    ],
  },
];

export default function DocSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40 bg-muted/10">
      {/* Header */}
      <SidebarHeader className="py-4 px-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
              <Link href="/" className="gap-3">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg border bg-background shadow-sm">
                  <BrandingLogo width={20} height={20} />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold tracking-wide text-foreground">
                    Zinga API
                  </span>
                  <span className="truncate text-xs font-mono text-muted-foreground">v1.0.0</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="mx-4 bg-border/40" />

      {/* Sidebar items */}
      <SidebarContent className="px-2 py-2 gap-0">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-2">
            <SidebarGroupLabel className="text-[11px] font-bold tracking-widest text-muted-foreground/70 uppercase px-2 mb-1 group-data-[collapsible=icon]:hidden">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((it) => {
                  const isActive = pathname === it.url;
                  return (
                    <SidebarMenuItem key={it.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={it.title}
                        className={cn(
                          'transition-all duration-200',
                          isActive
                            ? 'bg-primary/10 text-primary font-semibold hover:bg-primary/15'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                        )}
                      >
                        <Link href={it.url} className="flex items-center gap-3">
                          <it.icon
                            className={cn(
                              'h-[18px] w-[18px]',
                              isActive ? 'text-primary' : 'text-muted-foreground/70',
                            )}
                          />
                          <span>{it.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
