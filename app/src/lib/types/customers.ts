import { UserStatus } from '../constants/user';
import { AccountSession } from './session';

export type Customer = {
  _id: string;
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  avatar?: string;
  createdAt?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  authProvider?: string;
  stripeId?: string;
  expoPushTokens?: Array<{ token: string; platform: string; lastUpdated: string }>;
  linkedAccounts?: {
    stores?: string[];
    isCustomer?: boolean;
  };
  activeAccount?: {
    role?: string;
    id?: string;
  };
  sessions?: AccountSession[];

  bookingRequests?: number;
  activeBookings?: number;
  completedBookings?: number;
  walletBalance?: number;
  totalSpent?: number;

  isBlocked?: boolean;
  notificationsEnabled?: boolean;

  status: UserStatus;
};
