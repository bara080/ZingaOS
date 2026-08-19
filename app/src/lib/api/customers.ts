import { CustomerFilters } from '../filters/customers';
import { Customer } from '../types';

export async function fetchCustomers(page: number, limit: number, filters: CustomerFilters) {
  const params = new URLSearchParams();

  params.set('page', String(page));
  params.set('limit', String(limit));

  if (filters.name) params.set('name', filters.name);
  if (filters.email) params.set('email', filters.email);
  if (filters.phone) params.set('phone', filters.phone);
  if (filters.uid) params.set('uid', filters.uid);
  if (filters.registeredFrom) params.set('from', filters.registeredFrom);
  if (filters.registeredTo) params.set('to', filters.registeredTo);

  const res = await fetch(`/api/customers?${params.toString()}`);

  if (!res.ok) {
    throw new Error('Failed to fetch customers');
  }

  return res.json() as Promise<{
    customers: Customer[];
    total: number;
  }>;
}

export async function fetchCustomerDetails(id: string): Promise<Customer> {
  const res = await fetch(`/api/customers/${id}`);

  if (!res.ok) {
    throw new Error('Failed to fetch service provider');
  }

  const data = await res.json();
  return data.customer;
}
