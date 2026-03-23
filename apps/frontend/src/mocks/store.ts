// In-memory mutable state — имитирует базу данных для mock-режима

import {
  MOCK_CURRENT_USER,
  MOCK_FRIENDS,
  MOCK_GROUPS_INITIAL,
  MOCK_PHOTOS_INITIAL,
} from './data'

type MockUser = Omit<typeof MOCK_CURRENT_USER, 'avatarUrl'> & { avatarUrl: string | null }
type MockGroup = (typeof MOCK_GROUPS_INITIAL)[number]
type MockPhoto = (typeof MOCK_PHOTOS_INITIAL)['group-1'][number]

interface MockStore {
  user: MockUser
  groups: MockGroup[]
  photos: Record<string, MockPhoto[]>
  friends: typeof MOCK_FRIENDS
}

// Deep clone initial data so it stays mutable between "requests"
export const mockStore: MockStore = {
  user: { ...MOCK_CURRENT_USER },
  groups: MOCK_GROUPS_INITIAL.map((g) => ({ ...g })),
  photos: Object.fromEntries(
    Object.entries(MOCK_PHOTOS_INITIAL).map(([k, v]) => [k, v.map((p) => ({ ...p }))])
  ),
  friends: MOCK_FRIENDS.map((f) => ({ ...f })),
}

// ── Helpers ────────────────────────────────────────────────────

export function getUserGroups(): MockGroup[] {
  const userId = mockStore.user.id
  return mockStore.groups.filter((g) =>
    g.members.some((m) => m.userId === userId)
  )
}

export function getGroup(id: string): MockGroup | undefined {
  return mockStore.groups.find((g) => g.id === id)
}

export function getPhotos(groupId: string): MockPhoto[] {
  return mockStore.photos[groupId] ?? []
}

export function addGroup(group: MockGroup): void {
  mockStore.groups.unshift(group)
  mockStore.photos[group.id] = []
}

export function updateGroup(id: string, patch: Partial<MockGroup>): MockGroup | null {
  const idx = mockStore.groups.findIndex((g) => g.id === id)
  if (idx === -1) return null
  mockStore.groups[idx] = { ...mockStore.groups[idx], ...patch }
  return mockStore.groups[idx]
}

export function addPhoto(groupId: string, photo: MockPhoto): void {
  if (!mockStore.photos[groupId]) mockStore.photos[groupId] = []
  mockStore.photos[groupId].unshift(photo)

  // Update group photo count
  const group = mockStore.groups.find((g) => g.id === groupId)
  if (group) group._count.photos++
}

export function removePhoto(groupId: string, photoId: string): boolean {
  const photos = mockStore.photos[groupId]
  if (!photos) return false
  const idx = photos.findIndex((p) => p.id === photoId)
  if (idx === -1) return false
  photos.splice(idx, 1)

  const group = mockStore.groups.find((g) => g.id === groupId)
  if (group) group._count.photos = Math.max(0, group._count.photos - 1)
  return true
}

export function updateUser(patch: Partial<MockUser>): MockUser {
  Object.assign(mockStore.user, patch)
  return mockStore.user
}
