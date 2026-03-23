// ─── Static mock data — единственный источник истины для моков ───────────────

export const MOCK_CURRENT_USER = {
  id: 'mock-user-1',
  yandexId: '1234567890',
  name: 'Александр Смирнов',
  avatarUrl: 'https://i.pravatar.cc/150?u=mock-user-1',
  phone: '+7 999 123-45-67',
  createdAt: '2024-01-15T08:00:00.000Z',
  updatedAt: '2024-08-20T12:00:00.000Z',
}

export const MOCK_FRIENDS = [
  {
    id: 'mock-user-2',
    name: 'Мария Иванова',
    avatarUrl: 'https://i.pravatar.cc/150?u=mock-user-2',
    phone: '+7 916 234-56-78',
    createdAt: '2024-02-10T10:00:00.000Z',
  },
  {
    id: 'mock-user-3',
    name: 'Дмитрий Козлов',
    avatarUrl: 'https://i.pravatar.cc/150?u=mock-user-3',
    phone: '+7 925 345-67-89',
    createdAt: '2024-03-05T09:00:00.000Z',
  },
  {
    id: 'mock-user-4',
    name: 'Анна Петрова',
    avatarUrl: 'https://i.pravatar.cc/150?u=mock-user-4',
    phone: null,
    createdAt: '2024-04-01T11:00:00.000Z',
  },
  {
    id: 'mock-user-5',
    name: 'Сергей Новиков',
    avatarUrl: 'https://i.pravatar.cc/150?u=mock-user-5',
    phone: '+7 903 456-78-90',
    createdAt: '2024-05-15T14:00:00.000Z',
  },
  {
    id: 'mock-user-6',
    name: 'Елена Соколова',
    avatarUrl: null,
    phone: '+7 911 567-89-01',
    createdAt: '2024-06-01T16:00:00.000Z',
  },
]

const makeMembers = (memberIds: string[]) =>
  memberIds.map((userId, i) => {
    const friend = [MOCK_CURRENT_USER, ...MOCK_FRIENDS].find((u) => u.id === userId)
    return {
      id: `member-${userId}`,
      groupId: '',  // filled per-group
      userId,
      role: i === 0 ? 'OWNER' : 'MEMBER',
      joinedAt: `2024-07-0${i + 1}T10:00:00.000Z`,
      user: {
        id: friend!.id,
        name: friend!.name,
        avatarUrl: friend!.avatarUrl,
      },
    }
  })

export const MOCK_GROUPS_INITIAL = [
  {
    id: 'group-1',
    name: 'Горный Алтай, лето 2024',
    coverKey: 'groups/group-1/cover.jpg',
    coverUrl: 'https://picsum.photos/seed/altai/800/600',
    lat: 51.9506,
    lng: 85.9641,
    address: 'Республика Алтай, Россия',
    ownerId: 'mock-user-1',
    createdAt: '2024-07-01T08:00:00.000Z',
    updatedAt: '2024-08-20T15:30:00.000Z',
    members: makeMembers(['mock-user-1', 'mock-user-2', 'mock-user-3', 'mock-user-4']).map(
      (m) => ({ ...m, groupId: 'group-1' })
    ),
    _count: { photos: 8, members: 4 },
  },
  {
    id: 'group-2',
    name: 'Байкал, август',
    coverKey: 'groups/group-2/cover.jpg',
    coverUrl: 'https://picsum.photos/seed/baikal/800/600',
    lat: 53.5587,
    lng: 108.165,
    address: 'Иркутская область, Россия',
    ownerId: 'mock-user-1',
    createdAt: '2024-08-01T09:00:00.000Z',
    updatedAt: '2024-08-10T18:00:00.000Z',
    members: makeMembers(['mock-user-1', 'mock-user-2']).map((m) => ({
      ...m,
      groupId: 'group-2',
    })),
    _count: { photos: 5, members: 2 },
  },
  {
    id: 'group-3',
    name: 'Сочи, Новый год 2024',
    coverKey: 'groups/group-3/cover.jpg',
    coverUrl: 'https://picsum.photos/seed/sochi/800/600',
    lat: 43.5853,
    lng: 39.7203,
    address: 'Сочи, Краснодарский край',
    ownerId: 'mock-user-2',
    createdAt: '2023-12-28T10:00:00.000Z',
    updatedAt: '2024-01-05T20:00:00.000Z',
    members: makeMembers(['mock-user-2', 'mock-user-1', 'mock-user-5', 'mock-user-6']).map(
      (m) => ({ ...m, groupId: 'group-3' })
    ),
    _count: { photos: 12, members: 4 },
  },
  {
    id: 'group-4',
    name: 'Питер, белые ночи',
    coverKey: 'groups/group-4/cover.jpg',
    coverUrl: 'https://picsum.photos/seed/spb/800/600',
    lat: 59.9311,
    lng: 30.3609,
    address: 'Санкт-Петербург, Россия',
    ownerId: 'mock-user-3',
    createdAt: '2024-06-01T07:00:00.000Z',
    updatedAt: '2024-06-25T23:00:00.000Z',
    members: makeMembers(['mock-user-3', 'mock-user-1', 'mock-user-4']).map((m) => ({
      ...m,
      groupId: 'group-4',
    })),
    _count: { photos: 6, members: 3 },
  },
]

// Photos per group
const makePhotos = (groupId: string, seeds: string[]) =>
  seeds.map((seed, i) => ({
    id: `photo-${groupId}-${i + 1}`,
    groupId,
    storageKey: `groups/${groupId}/photos/${seed}.jpg`,
    url: `https://picsum.photos/seed/${seed}/600/800`,
    caption: null,
    takenAt: null,
    createdAt: `2024-07-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
    uploader: {
      id: MOCK_CURRENT_USER.id,
      name: MOCK_CURRENT_USER.name,
      avatarUrl: MOCK_CURRENT_USER.avatarUrl,
    },
  }))

export const MOCK_PHOTOS_INITIAL: Record<string, ReturnType<typeof makePhotos>> = {
  'group-1': makePhotos('group-1', [
    'mountain1', 'mountain2', 'mountain3', 'river1',
    'forest1', 'camp1', 'sunset1', 'altai1',
  ]),
  'group-2': makePhotos('group-2', [
    'lake1', 'baikal1', 'boat1', 'water1', 'shore1',
  ]),
  'group-3': makePhotos('group-3', [
    'sea1', 'beach1', 'city1', 'newyear1', 'fireworks1',
    'sochi1', 'resort1', 'palm1', 'snow1', 'hotel1', 'food1', 'night1',
  ]),
  'group-4': makePhotos('group-4', [
    'spb1', 'bridge1', 'palace1', 'neva1', 'hermitage1', 'night2',
  ]),
}
