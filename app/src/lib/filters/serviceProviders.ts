import { FilterField } from './types';
import { categorySelectOptions } from './helpers';
import { CategoryValue } from '../constants/categories';

export type ZingaSPFilters = {
  store: string;
  owner: string;
  category: CategoryValue;
  location: string;
  registeredFrom: string;
  registeredTo: string;
};

export const serviceProviderFiltersConfig: FilterField<ZingaSPFilters>[] = [
  { name: 'store', label: 'Store Name', type: 'text' },
  { name: 'owner', label: 'Owner', type: 'text' },
  {
    name: 'category',
    label: 'Category',
    type: 'select',
    allowAll: true,
    placeholder: 'All categories',
    options: categorySelectOptions,
  },
  { name: 'location', label: 'Location', type: 'text' },
  { name: 'registeredFrom', label: 'Registered From', type: 'date' },
  { name: 'registeredTo', label: 'Registered To', type: 'date' },
];
