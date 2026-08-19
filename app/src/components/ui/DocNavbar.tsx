'use client';

import { LogOut, Moon, Settings, User, Sun, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from './button';
import { useTheme } from 'next-themes';
import { SidebarTrigger } from './sidebar';
import { useCurrentUser } from '@/lib/auth';

const DocNavbar = () => {
  const { setTheme } = useTheme();
  const router = useRouter();
  const { user } = useCurrentUser();

  async function handleLogout() {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('Logout failed');
      router.push('/login');
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <nav className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/80 border-b border-border/40 p-4 flex items-center justify-between transition-colors duration-300">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <div className="hidden sm:flex items-center gap-2 ml-2">
          <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-md text-[11px] font-mono border border-border/50 uppercase tracking-wider font-semibold">
            Docs
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Polished Command-Palette-style Search Trigger */}
        <button className="group hidden sm:flex items-center gap-2 rounded-full border border-border/50 bg-muted/30 hover:bg-muted/60 px-4 py-1.5 transition-colors max-w-[240px] w-full justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Search className="h-4 w-4 opacity-70" />
            <span className="text-sm font-normal">Search API...</span>
          </div>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border/50 bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 shadow-sm">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>

        {/* Theme toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-border/50 bg-muted/30 hover:bg-muted/60"
            >
              <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>{user?.email ? user.email[0].toUpperCase() : 'U'}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={12} className="mr-3">
            <DropdownMenuLabel>
              {user ? (
                <div>
                  <div className="font-medium">{user.email}</div>
                  <div className="text-xs text-muted-foreground">{user.role}</div>
                </div>
              ) : (
                'My Account'
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};

export default DocNavbar;
