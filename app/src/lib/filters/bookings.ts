import { CategoryValue } from '../constants/categories';
import { categorySelectOptions } from './helpers';
import { FilterField } from './types';

export type BookingFilters = {
  bookingId: string;
  storeId: string;
  status: string;
  category: CategoryValue;
  createdFrom: string;
  createdTo: string;
};

export const bookingFiltersConfig: FilterField<BookingFilters>[] = [
  {
    name: 'bookingId',
    label: 'Booking ID',
    type: 'text',
  },
  {
    name: 'storeId',
    label: 'Store ID',
    type: 'text',
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    allowAll: true,
    placeholder: 'All statuses',
    options: [
      { label: 'Pending', value: 'pending' },
      { label: 'Accepted', value: 'accepted' },
      { label: 'Completed', value: 'completed' },
      { label: 'Cancelled', value: 'cancelled' },
    ],
  },
  {
    name: 'category',
    label: 'Category',
    type: 'select',
    allowAll: true,
    placeholder: 'All categories',
    options: categorySelectOptions,
  },
  {
    name: 'createdFrom',
    label: 'Created From',
    type: 'date',
  },
  {
    name: 'createdTo',
    label: 'Created To',
    type: 'date',
  },
];
