import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import FooterAuth from '@/components/ui/footerAuth';
import DocSidebar from '@/components/ui/DocSidebar';
import DocNavbar from '@/components/ui/DocNavbar';
import { cookies } from 'next/headers';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <DocSidebar />
      <SidebarInset className="bg-background">
        <DocNavbar />
        <main className="flex-1 w-full flex flex-col items-center">
          <div className="w-full max-w-7xl px-4 sm:px-6 md:px-8 py-6 md:py-10">{children}</div>
        </main>
        <FooterAuth />
      </SidebarInset>
    </SidebarProvider>
  );
}
