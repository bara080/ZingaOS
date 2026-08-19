'use client';

import { cn } from '@/lib/utils/common';
import { ReactNode } from 'react';

export interface StatusBadge {
  key: string;
  label: string;
  icon?: ReactNode;
  show?: boolean;
  variant?: 'success' | 'info' | 'neutral';
}

const variants = {
  success: 'bg-green-100 text-green-700',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-secondary text-secondary-foreground',
};

interface Props {
  items: StatusBadge[];
  className?: string;
}

export function StatusBadges({ items, className }: Props) {
  const visible = items.filter((i) => i.show);

  if (!visible.length) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {visible.map((item) => (
        <span
          key={item.key}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
            variants[item.variant || 'neutral'],
          )}
        >
          {item.icon && <span className="w-3.5 h-3.5">{item.icon}</span>}
          {item.label}
        </span>
      ))}
    </div>
  );
}
