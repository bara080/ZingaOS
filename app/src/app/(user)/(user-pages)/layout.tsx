import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/ui/AppSidebar';
import FooterAuth from '@/components/ui/footerAuth';
import Navbar from '@/components/ui/Navbar';
import { CommandPalette } from '@/components/search/command-palette';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await import('next/headers').then((m) => m.cookies());
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <Navbar />
        <main className="px-5">{children}</main>
        <FooterAuth />

        <CommandPalette />
      </SidebarInset>
    </SidebarProvider>
  );
}
