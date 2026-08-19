import { FilterField } from './types';

export type CustomerFilters = {
  name: string;
  email: string;
  phone: string;
  uid: string;
  registeredFrom: string;
  registeredTo: string;
};

export const customerFiltersConfig: FilterField<CustomerFilters>[] = [
  { name: 'name', label: 'Name', type: 'text' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'uid', label: 'UID', type: 'text' },
  { name: 'registeredFrom', label: 'Registered From', type: 'date' },
  { name: 'registeredTo', label: 'Registered To', type: 'date' },
];
