'use client';

import { useSidebar } from '@/components/ui/sidebar';

export function useCloseSidebarOnNavigate() {
  const { isMobile, setOpenMobile } = useSidebar();

  return () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
}
