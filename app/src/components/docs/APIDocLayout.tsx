'use client';
import { useEffect, useState, ReactNode } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';

interface APIDocSectionLink {
  id: string;
  title: string;
}

interface APIDocLayoutProps {
  title: string;
  description: string;
  sections: APIDocSectionLink[];
  children: ReactNode;
}

export function APIDocLayout({ title, description, sections, children }: APIDocLayoutProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: '-40% 0px -40% 0px' },
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 10, behavior: 'smooth' });
  };

  return (
    <div className="relative flex">
      {/* MAIN CONTENT */}
      <div className="flex-1 pr-64 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-3">{title}</h1>
        <p className="text-muted-foreground mb-8">{description}</p>
        {children}
      </div>

      {/* SIDEBAR */}
      <aside className="hidden lg:block fixed right-10 top-24 w-56">
        <ScrollArea className="h-[80vh] border-l pl-4">
          <p className="uppercase text-[10px] font-semibold text-muted-foreground mb-3">
            On this page
          </p>
          <Separator className="mb-3" />
          <div className="space-y-1">
            {sections.map((s) => (
              <Button
                key={s.id}
                variant="ghost"
                size="sm"
                className={`w-full justify-start ${
                  activeSection === s.id
                    ? 'text-foreground font-semibold bg-muted'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => scrollTo(s.id)}
              >
                {s.title}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </aside>
    </div>
  );
}
