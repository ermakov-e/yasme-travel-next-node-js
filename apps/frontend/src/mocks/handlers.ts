import { http, HttpResponse, delay } from 'msw'
import {
  mockStore,
  getUserGroups,
  getGroup,
  getPhotos,
  addGroup,
  updateGroup,
  addPhoto,
  removePhoto,
  updateUser,
} from './store'

// Небольшая задержка для реалистичности
const LAG = () => delay(200)

// Счётчик для генерации уникальных ID
let idCounter = 100

function uid(prefix = 'id') {
  return `mock-${prefix}-${++idCounter}-${Date.now()}`
}

function paginate<T>(items: T[], page: number, limit: number) {
  const skip = (page - 1) * limit
  return {
    data: items.slice(skip, skip + limit),
    total: items.length,
    page,
    limit,
  }
}

export const handlers = [
  // ═══════════════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════════════

  http.get('/api/v1/auth/me', async () => {
    await LAG()
    return HttpResponse.json(mockStore.user)
  }),

  http.post('/api/v1/auth/logout', async () => {
    await LAG()
    return HttpResponse.json({ message: 'Logged out successfully' })
  }),

  // ═══════════════════════════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════════════════════════

  http.get('/api/v1/users/me', async () => {
    await LAG()
    return HttpResponse.json(mockStore.user)
  }),

  http.patch('/api/v1/users/me', async ({ request }) => {
    await LAG()
    const body = (await request.json()) as any

    const updated = updateUser({
      ...(body.name !== undefined && { name: body.name }),
      // avatarKey → просто назначаем пикчу
      ...(body.avatarKey !== undefined && {
        avatarUrl: body.avatarKey
          ? `https://picsum.photos/seed/${body.avatarKey}/150/150`
          : null,
      }),
    })

    return HttpResponse.json(updated)
  }),

  // ═══════════════════════════════════════════════════════════
  // FRIENDS
  // ═══════════════════════════════════════════════════════════

  http.get('/api/v1/friends', async ({ request }) => {
    await LAG()
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const limit = Number(url.searchParams.get('limit') ?? 50)
    const search = url.searchParams.get('search')?.toLowerCase()

    let friends = mockStore.friends
    if (search) {
      friends = friends.filter(
        (f) =>
          f.name.toLowerCase().includes(search) ||
          (f.phone ?? '').includes(search)
      )
    }

    return HttpResponse.json(paginate(friends, page, limit))
  }),

  // ═══════════════════════════════════════════════════════════
  // GROUPS
  // ═══════════════════════════════════════════════════════════

  http.get('/api/v1/groups', async ({ request }) => {
    await LAG()
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const limit = Number(url.searchParams.get('limit') ?? 20)

    const groups = getUserGroups()
    return HttpResponse.json(paginate(groups, page, limit))
  }),

  http.post('/api/v1/groups', async ({ request }) => {
    await delay(400) // чуть дольше — "создание"
    const body = (await request.json()) as any

    const groupId = uid('group')
    const now = new Date().toISOString()

    const newGroup = {
      id: groupId,
      name: body.name,
      coverKey: body.coverKey ?? null,
      // Для обложки используем случайное picsum изображение
      coverUrl: body.coverKey
        ? `https://picsum.photos/seed/${groupId}/800/600`
        : null,
      lat: body.lat,
      lng: body.lng,
      address: body.address ?? null,
      ownerId: mockStore.user.id,
      createdAt: now,
      updatedAt: now,
      members: [
        {
          id: uid('member'),
          groupId,
          userId: mockStore.user.id,
          role: 'OWNER' as const,
          joinedAt: now,
          user: {
            id: mockStore.user.id,
            name: mockStore.user.name,
            avatarUrl: mockStore.user.avatarUrl,
          },
        },
        ...((body.memberIds as string[]) ?? [])
          .filter((id: string) => id !== mockStore.user.id)
          .map((userId: string) => {
            const friend = mockStore.friends.find((f) => f.id === userId)
            return {
              id: uid('member'),
              groupId,
              userId,
              role: 'MEMBER' as const,
              joinedAt: now,
              user: {
                id: userId,
                name: friend?.name ?? 'Пользователь',
                avatarUrl: friend?.avatarUrl ?? null,
              },
            }
          }),
      ],
      _count: { photos: 0, members: 1 + ((body.memberIds as string[]) ?? []).length },
    }

    addGroup(newGroup as any)
    return HttpResponse.json(newGroup, { status: 201 })
  }),

  http.get('/api/v1/groups/:id', async ({ params }) => {
    await LAG()
    const group = getGroup(params.id as string)
    if (!group) return HttpResponse.json({ error: 'NOT_FOUND', message: 'Group not found', statusCode: 404 }, { status: 404 })
    return HttpResponse.json(group)
  }),

  http.patch('/api/v1/groups/:id', async ({ params, request }) => {
    await LAG()
    const body = (await request.json()) as any
    const group = getGroup(params.id as string)
    if (!group) return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    if (group.ownerId !== mockStore.user.id)
      return HttpResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

    const updated = updateGroup(params.id as string, {
      ...body,
      coverUrl: body.coverKey
        ? `https://picsum.photos/seed/${body.coverKey}/800/600`
        : group.coverUrl,
      updatedAt: new Date().toISOString(),
    })
    return HttpResponse.json(updated)
  }),

  http.delete('/api/v1/groups/:id', async ({ params }) => {
    await LAG()
    const idx = mockStore.groups.findIndex((g) => g.id === params.id)
    if (idx === -1) return new HttpResponse(null, { status: 404 })
    mockStore.groups.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // Members
  http.get('/api/v1/groups/:id/members', async ({ params }) => {
    await LAG()
    const group = getGroup(params.id as string)
    if (!group) return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    return HttpResponse.json(group.members)
  }),

  http.post('/api/v1/groups/:id/members', async ({ params, request }) => {
    await LAG()
    const body = (await request.json()) as any
    const group = getGroup(params.id as string)
    if (!group) return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

    const friend = mockStore.friends.find((f) => f.id === body.userId)
    const newMember = {
      id: uid('member'),
      groupId: params.id as string,
      userId: body.userId,
      role: 'MEMBER' as const,
      joinedAt: new Date().toISOString(),
      user: {
        id: body.userId,
        name: friend?.name ?? 'Пользователь',
        avatarUrl: friend?.avatarUrl ?? null,
      },
    }
    group.members.push(newMember)
    group._count.members++
    return HttpResponse.json(newMember, { status: 201 })
  }),

  http.delete('/api/v1/groups/:id/members/:userId', async ({ params }) => {
    await LAG()
    const group = getGroup(params.id as string)
    if (!group) return new HttpResponse(null, { status: 404 })
    const idx = group.members.findIndex((m) => m.userId === params.userId)
    if (idx !== -1) {
      group.members.splice(idx, 1)
      group._count.members = Math.max(0, group._count.members - 1)
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // ═══════════════════════════════════════════════════════════
  // PHOTOS
  // ═══════════════════════════════════════════════════════════

  http.get('/api/v1/groups/:groupId/photos', async ({ params, request }) => {
    await LAG()
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const limit = Number(url.searchParams.get('limit') ?? 20)
    const photos = getPhotos(params.groupId as string)
    return HttpResponse.json(paginate(photos, page, limit))
  }),

  http.post('/api/v1/groups/:groupId/photos/presign', async ({ params }) => {
    await LAG()
    const storageKey = `groups/${params.groupId}/photos/${uid('photo')}.jpg`
    return HttpResponse.json({
      presignedUrl: `https://mock-s3.yasme.test/upload/${storageKey}`,
      storageKey,
    })
  }),

  http.post('/api/v1/groups/:groupId/photos/confirm', async ({ params, request }) => {
    await delay(300)
    const body = (await request.json()) as any
    const now = new Date().toISOString()

    // Используем случайное picsum фото как будто это загруженное изображение
    const photoId = uid('photo')
    const seed = `upload-${photoId}`
    const newPhoto = {
      id: photoId,
      groupId: params.groupId as string,
      storageKey: body.storageKey,
      url: `https://picsum.photos/seed/${seed}/600/800`,
      caption: body.caption ?? null,
      takenAt: body.takenAt ?? null,
      createdAt: now,
      uploader: {
        id: mockStore.user.id,
        name: mockStore.user.name,
        avatarUrl: mockStore.user.avatarUrl,
      },
    }

    addPhoto(params.groupId as string, newPhoto as any)
    return HttpResponse.json(newPhoto, { status: 201 })
  }),

  http.delete('/api/v1/groups/:groupId/photos/:photoId', async ({ params }) => {
    await LAG()
    removePhoto(params.groupId as string, params.photoId as string)
    return new HttpResponse(null, { status: 204 })
  }),

  // ═══════════════════════════════════════════════════════════
  // STORAGE (presign)
  // ═══════════════════════════════════════════════════════════

  http.post('/api/v1/storage/cover-presign', async () => {
    await LAG()
    const storageKey = `temp/${uid('cover')}.jpg`
    return HttpResponse.json({
      presignedUrl: `https://mock-s3.yasme.test/upload/${storageKey}`,
      storageKey,
    })
  }),

  http.post('/api/v1/storage/avatar-presign', async () => {
    await LAG()
    const storageKey = `avatars/${mockStore.user.id}/${uid('avatar')}.jpg`
    return HttpResponse.json({
      presignedUrl: `https://mock-s3.yasme.test/upload/${storageKey}`,
      storageKey,
    })
  }),

  // ═══════════════════════════════════════════════════════════
  // Fake S3 PUT — имитируем успешную загрузку
  // ═══════════════════════════════════════════════════════════
  http.put('https://mock-s3.yasme.test/*', async () => {
    await delay(500) // имитация загрузки
    return new HttpResponse(null, { status: 200 })
  }),
]
