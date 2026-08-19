'use client';

import { cn } from '@/lib/utils/common';
import { ReactNode } from 'react';

interface InfoRowProps {
  label?: string;
  value?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function InfoRow({ label, value, icon, className }: InfoRowProps) {
  const displayValue = value === undefined || value === null || value === '' ? '-' : value;

  return (
    <div className={cn('flex items-start gap-2 text-sm', className)}>
      {icon && <div className="mt-0.5 text-muted-foreground">{icon}</div>}

      <div className="flex-1 flex justify-between gap-4">
        {label && <span className="font-medium text-muted-foreground">{label}</span>}
        <span className="text-foreground text-right">{displayValue}</span>
      </div>
    </div>
  );
}
