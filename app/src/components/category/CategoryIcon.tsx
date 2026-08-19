'use client';

import { Car, Scissors, Camera, Sparkles, HandHeart, MoreHorizontal } from 'lucide-react';

import { CATEGORY_ICON_MAP } from '@/lib/category';

const ICON_COMPONENT_MAP: Record<string, React.ElementType> = {
  auto: Car,
  barber: Scissors,
  'beauty-salon': Sparkles,
  photography: Camera,
  massage: HandHeart,
  more: MoreHorizontal,
};

export function CategoryIcon({
  category,
  color,
  size = 14,
}: {
  category?: string;
  color?: string;
  size?: number;
}) {
  const iconKey = CATEGORY_ICON_MAP[category || ''] || 'more';
  const Icon = ICON_COMPONENT_MAP[iconKey] || MoreHorizontal;

  return <Icon size={size} style={{ color }} />;
}
