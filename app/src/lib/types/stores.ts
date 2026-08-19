import { CategoryValue } from '../constants/categories';
import { UserStatus } from '../constants/user';
import { AccountSession } from './session';

export type StoreMediaType = 'image' | 'video';

export interface StoreLocation {
  address: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  lat: number;
  lng: number;
}

export type LinkedAccounts = {
  isCustomer?: boolean;
  isProvider?: boolean;
  [key: string]: boolean | string[] | undefined;
};

export type StoreOwner = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;

  isBlocked?: boolean;

  linkedAccounts?: {
    isCustomer?: boolean;
  };

  stores?: string[];
  sessions?: AccountSession[];
};

export interface ServiceDuration {
  number: number;
  unit: string;
  totalMinutes: number;
}

export interface StoreService {
  _id: string;
  serviceCategory: string;
  serviceTitle: string;
  servicePhoto: string;
  serviceDescription: string;
  inStorePrice: number;
  duration: ServiceDuration;
  inHomeServiceOffered: boolean;
  inHomePrice?: number;
  serviceTypes?: string[];
  serviceCount?: number;
}

export interface StoreMedia {
  _id?: string;
  title: string;
  description?: string;
  url: string;
  type?: StoreMediaType;
  createdAt?: string | Date;
}

export interface StoreReview {
  _id: string;
  requestId: string;
  customerUid: string;
  serviceId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface Store {
  storeId: string;
  storeLogo: string;
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storeCategory: string;
  storeDescription?: string;
  location: StoreLocation;
  storeMedia?: StoreMedia[];
  owner: StoreOwner;
  services: StoreService[];
  reviews?: StoreReview[];
  stripeAccountId?: string;
  isFreelancer?: boolean;
  createdAt: string;
  updatedAt: string;
}

// export type ServiceProvider = {
//   id: string;
//   company: string;
//   category?: string;
//   description?: string;
//   avatar?: string;
//   name?: string;
//   email?: string;
//   phone?: string;
//   address?: string;
//   city?: string;
//   country?: string;
//   createdAt?: string;
//   storeLogo?: string;
// };

export type ServiceProvider = {
  id: string;
  company: string;
  category: CategoryValue;
  storeLogo?: string;
  description?: string;
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  createdAt: string;

  avatar?: string;
  address?: string;
  status: UserStatus;
};
