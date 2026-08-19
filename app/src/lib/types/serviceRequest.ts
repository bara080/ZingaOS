export interface ServiceRequestListItem {
  id: string; // _id
  requestId: string;
  bookingId: string;

  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAvatar?: string;

  storeName?: string;
  storeLogo?: string;

  category: string;
  serviceTitle?: string;

  status: 'pending' | 'accepted' | 'rejected' | 'canceled' | 'completed';

  scheduledAt?: string;
  createdAt: string;
}
