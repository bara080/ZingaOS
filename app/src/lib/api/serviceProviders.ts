import { ALL_CATEGORIES_VALUE } from '../constants/categories';
import { Store } from '../types';

type Filters = {
  store: string;
  owner: string;
  category: string;
  location: string;
  registeredFrom: string;
  registeredTo: string;
};

export type StoreStats = {
  bookingRequests: number;
  activeBookings: number;
  completedBookings: number;
  totalEarned: number;
  walletBalance: number;
};

export type ServiceProviderDetailsResponse = {
  provider: Store;
  stats: StoreStats;
};

export async function fetchServiceProviders(page: number, limit: number, filters: Filters) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (filters.store) params.set('store', filters.store);
  if (filters.owner) params.set('owner', filters.owner);
  if (filters.category && filters.category !== ALL_CATEGORIES_VALUE) {
    params.set('category', filters.category);
  }
  if (filters.location) params.set('location', filters.location);
  if (filters.registeredFrom) params.set('from', filters.registeredFrom);
  if (filters.registeredTo) params.set('to', filters.registeredTo);

  const res = await fetch(`/api/service-providers?${params.toString()}`);

  if (!res.ok) {
    throw new Error('Failed to fetch service providers');
  }

  return res.json();
}

export async function fetchServiceProviderDetails(
  id: string,
): Promise<ServiceProviderDetailsResponse> {
  const res = await fetch(`/api/service-providers/${id}`);

  if (!res.ok) {
    throw new Error('Failed to fetch service provider');
  }

  return res.json();
}
