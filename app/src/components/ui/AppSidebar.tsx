'use client';

import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { ChevronDown, Settings2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import BrandingLogo from '../BrandingLogo';
import { NAV_GROUPS, NavGroup } from '@/lib/navigation';
import { can } from '@/lib/auth/guards';
import { useCloseSidebarOnNavigate } from '@/hooks/useCloseSidebarOnNavigate';
import { useCurrentUser } from '@/lib/auth';

function NavGroupRenderer({ group }: { group: NavGroup }) {
  const pathname = usePathname();
  const closeSidebar = useCloseSidebarOnNavigate();

  const content = (
    <SidebarGroupContent>
      <SidebarMenu>
        {group.items.map((it) => (
          <SidebarMenuItem key={it.title}>
            <SidebarMenuButton asChild isActive={pathname.startsWith(it.url)}>
              <Link href={it.url} onClick={closeSidebar}>
                <it.icon />
                <span>{it.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroupContent>
  );

  if (!group.collapsible) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
        {content}
      </SidebarGroup>
    );
  }

  return (
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="flex w-full items-center">
            {group.label}
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>{content}</CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

export default function AppSidebar() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  const closeSidebar = useCloseSidebarOnNavigate();

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.permission || (user?.role && can(user.role, item.permission)),
    ),
  })).filter((group) => group.items.length > 0);

  const { state, isMobile, setOpenMobile } = useSidebar();

  const isCollapsed = state === 'collapsed';

  async function handleLogout() {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('Logout failed');

      if (isMobile) setOpenMobile(false);
      router.push('/login');
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <BrandingLogo width={57} height={30} collapsed={isCollapsed} />
            <span className="font-semibold text-xs hidden">Admin</span>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="m-0" />

      <SidebarContent>
        {visibleGroups.map((group) => (
          <NavGroupRenderer key={group.label} group={group} />
        ))}
      </SidebarContent>

      <SidebarFooter>
        {can(user?.role, 'api-docs.view') && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/api-doc" target="_blank" onClick={closeSidebar}>
                  <Settings2 />
                  <span>API Documentation</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}

        <SidebarSeparator className="mx-0" />

        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>
                      {user?.email ? user.email[0].toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex flex-col items-start">
                    <span>{user?.displayName}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </span>
                  <ChevronDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile">Account</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <button onClick={handleLogout} className="w-full">
                    Logout
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
