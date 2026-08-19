export interface AccountSession {
  deviceId: string; // stable hash (recommended)
  deviceInfo: string; // "Chrome / Windows"
  ip?: string;
  lastActiveAt: string; // ISO date
  createdAt: string; // ISO date
}
