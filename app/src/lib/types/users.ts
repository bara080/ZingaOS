import { Role } from '@/lib/roles';
import { UserStatus } from '../constants/user';

// NOTE: Post Mongo→Supabase migration, all identifiers are Supabase `uuid`
// strings (auth.users.id / profiles.id). The old `ObjectId` type is gone.

export type SessionPayload = {
  sub: string;
  email: string;
  role: Role;
};

export type AdminUserListItem = {
  _id: string;
  displayName?: string;
  email: string;
  role: Role;
  status: UserStatus;
  invitedBy?: string | null;
  createdAt: string;
};

export type PublicUser = {
  _id: string;
  displayName?: string;
  email: string;
  role: Role;
};

export type UserDoc = {
  _id: string;
  email: string;
  displayName?: string;

  role: Role;
  status: UserStatus;

  // FK to the inviter's profile id (uuid string).
  invitedBy?: string | null;

  // Populated data (optional, runtime-only).
  inviter?: PublicUser | null;

  createdAt: string;
  updatedAt?: string;

  deletedAt?: string;
};

export type UserSession = {
  _id: string;
  email: string;
  displayName: string;
  role: Role;
};
