'use client';

import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils/common';
import { getCategoryTheme } from '@/lib/category';
import { CategoryIcon } from './CategoryIcon';

export function CategoryBadge({ category, className }: { category?: string; className?: string }) {
  const { resolvedTheme } = useTheme();

  const { bgColor, iconColor } = getCategoryTheme(
    category,
    resolvedTheme === 'dark' ? 'dark' : 'light',
  );

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-medium',
        className,
      )}
      style={{
        backgroundColor: bgColor,
        color: iconColor,
      }}
    >
      <CategoryIcon category={category} color={iconColor} size={14} />
      {category || 'More'}
    </span>
  );
}
