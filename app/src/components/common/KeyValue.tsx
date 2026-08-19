'use client';

import { cn } from '@/lib/utils/common';

interface Props {
  label: string;
  value?: string | string[];
  className?: string;
}

export default function KeyValue({ label, value, className }: Props) {
  const isArray = Array.isArray(value);
  const hasValue = isArray ? value.length > 0 : !!value;

  return (
    <div className={cn('grid grid-cols-2 gap-2 text-sm', className)}>
      <span className="text-muted-foreground">{label}</span>

      <div className="font-medium text-right">
        {!hasValue && '-'}

        {isArray &&
          value.map((v, i) => (
            <div key={i} className="truncate text-right">
              {v}
            </div>
          ))}

        {!isArray && hasValue && <span className="break-all text-right">{value}</span>}
      </div>
    </div>
  );
}
