import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AdminUserListItem } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value?: string | Date) {
  if (!value) return '-';

  const date = value instanceof Date ? value : new Date(value);

  return date
    .toLocaleString('en-US', {
      month: 'short', // Jan
      day: 'numeric', // 9
      year: 'numeric', // 2026
      hour: 'numeric', // 9
      minute: '2-digit', // 25
      hour12: true, // AM/PM format
    })
    .replace(',', ' -');
}

export function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : parts[0][0].toUpperCase() + parts.at(-1)![0].toUpperCase();
}

export function avatarColor(seed?: string) {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-indigo-500',
  ];
  return seed ? colors[seed.charCodeAt(0) % colors.length] : 'bg-gray-400';
}

export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const statusColorMap: Record<AdminUserListItem['status'], string> = {
  invited: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-gray-200 text-gray-600',
  disabled: 'bg-red-100 text-red-800',
};

export const formatCurrency = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
