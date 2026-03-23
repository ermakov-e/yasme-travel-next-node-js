import type { User } from './user.js';

export interface Photo {
  id: string;
  groupId: string;
  uploaderId: string;
  storageKey: string;
  url: string;
  caption: string | null;
  takenAt: string | null;
  createdAt: string;
  uploader: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}

export interface PresignRequest {
  filename: string;
  contentType: string;
  fileSize: number;
}

export interface PresignResponse {
  presignedUrl: string;
  storageKey: string;
}

export interface ConfirmUploadDto {
  storageKey: string;
  caption?: string;
  takenAt?: string;
}
