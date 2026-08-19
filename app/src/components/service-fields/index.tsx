'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/common';

export function ServiceTitle({ value }: { value?: string }) {
  return <h4 className="font-semibold text-base leading-tight">{value || 'Untitled Service'}</h4>;
}

export function ServiceCategory({ value }: { value?: string }) {
  if (!value) return null;

  return (
    <span className="inline-block font-semibold text-sm px-3 py-1.5 rounded-full bg-secondary">
      {value}
    </span>
  );
}

export function ServiceDescription({ value }: { value?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;
    setIsClamped(el.scrollHeight > el.clientHeight);
  }, [value]);

  if (!value) return null;

  return (
    <div className="space-y-1">
      <p
        ref={ref}
        className={cn('text-sm text-muted-foreground transition-all', !expanded && 'line-clamp-2')}
      >
        {value}
      </p>

      {isClamped && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {expanded ? 'Read less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

export function ServicePrice({ value }: { value?: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">Price</span>
      <span className="font-medium">{value ? `$${value}` : '-'}</span>
    </div>
  );
}

export function ServiceDuration({ value }: { value?: { number: number; unit: string } }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">Duration</span>
      <span>{value ? `${value.number} ${value.unit}` : '-'}</span>
    </div>
  );
}

export function ServiceInHome({ offered, price }: { offered?: boolean; price?: number }) {
  if (!offered) return null;

  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">In-Home</span>
      <span className="font-medium">{price ? `$${price}` : 'Available'}</span>
    </div>
  );
}
