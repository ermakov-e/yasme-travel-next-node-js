import type { User } from './user.js';

export type MemberRole = 'OWNER' | 'MEMBER';

export interface Group {
  id: string;
  name: string;
  coverKey: string | null;
  coverUrl: string | null;
  lat: number;
  lng: number;
  address: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  photoCount?: number;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
  user: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}

export interface GroupDetail extends Group {
  members: GroupMember[];
}

export interface CreateGroupDto {
  name: string;
  coverKey?: string;
  lat: number;
  lng: number;
  address?: string;
  memberIds?: string[];
}

export interface UpdateGroupDto {
  name?: string;
  coverKey?: string;
  lat?: number;
  lng?: number;
  address?: string;
}
