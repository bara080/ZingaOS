'use client';

import { LogOut, Moon, Settings, User, Sun, Search, Bell } from 'lucide-react';
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

const Navbar = () => {
  const { setTheme } = useTheme();
  const { user } = useCurrentUser();
  const router = useRouter();

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
    <nav className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <SidebarTrigger />

        {/* Search */}
        <button
          onClick={() =>
            document.dispatchEvent(
              new KeyboardEvent('keydown', {
                key: 'k',
                ctrlKey: true,
              }),
            )
          }
          className="group min-w-xs"
        >
          <div className="flex items-center justify-between gap-2 rounded-lg bg-primary-foreground px-3 py-2">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="text-sm">Search</span>
            </div>
            <span>⌘K</span>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Link href="/notifications">
          <Button variant="outline" size="icon" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
        </Link>

        {/* Theme toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
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
            <Avatar className="rounded-md">
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

export default Navbar;
