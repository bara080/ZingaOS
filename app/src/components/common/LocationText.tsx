'use client';

import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils/common';

export function LocationText({
  city,
  country,
  address,
  className,
  showAddress = false,
}: {
  city?: string;
  country?: string;
  address?: string;
  showAddress?: boolean;
  className?: string;
}) {
  if (!city && !country && !address) return <span>-</span>;

  return (
    <div className={cn('flex items-start gap-1.5 text-sm', className)}>
      <MapPin className="h-4 w-4 mt-[2px] text-muted-foreground shrink-0" />

      <div className="leading-tight">
        {(city || country) && (
          <div className="font-medium">{[city, country].filter(Boolean).join(', ')}</div>
        )}

        {showAddress && address && <div className="text-xs text-muted-foreground">{address}</div>}
      </div>
    </div>
  );
}
