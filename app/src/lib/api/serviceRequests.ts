import { ALL_CATEGORIES_VALUE } from '../constants/categories';
import { BookingFilters } from '../filters/bookings';

export async function fetchServiceRequests(page: number, limit: number, filters: BookingFilters) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  // 🔎 Exact search
  if (filters.bookingId.trim()) {
    params.set('bookingId', filters.bookingId.trim());
  }

  if (filters.storeId.trim()) {
    params.set('storeId', filters.storeId.trim());
  }

  // 📌 Enum filters
  if (filters.status) {
    params.set('status', filters.status);
  }

  // 🚫 DO NOT send "__all__"
  if (filters.category && filters.category !== ALL_CATEGORIES_VALUE) {
    params.set('category', filters.category);
  }

  // 📅 Date range
  if (filters.createdFrom) {
    params.set('createdFrom', filters.createdFrom);
  }

  if (filters.createdTo) {
    params.set('createdTo', filters.createdTo);
  }

  const res = await fetch(`/api/service-requests?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch bookings');

  return res.json();
}
