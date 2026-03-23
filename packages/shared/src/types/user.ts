export interface User {
  id: string;
  yandexId: string;
  name: string;
  avatarUrl: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserDto {
  name?: string;
  avatarKey?: string;
}
