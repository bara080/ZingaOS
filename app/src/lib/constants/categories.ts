export const ALL_CATEGORIES_VALUE = '__all__';

export const CATEGORIES = [
  { value: 'Auto Services', label: 'Auto Services' },
  { value: 'Barber Services', label: 'Barber Services' },
  { value: 'Beauty Salon Services', label: 'Beauty Salon Services' },
  { value: 'Photography Services', label: 'Photography Services' },
  { value: 'Massage Services', label: 'Massage Services' },
  { value: 'Other', label: 'Other' },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]['value'] | typeof ALL_CATEGORIES_VALUE;
