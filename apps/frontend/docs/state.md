# State Management — Управление состоянием

**Правило:** server state → TanStack Query v5, UI state → Zustand.

---

## Zustand Stores

### `auth.store.ts` — текущий пользователь

```typescript
import { create } from 'zustand'
import type { User } from '@yasme/shared'

interface AuthStore {
  user: User | null
  setUser: (user: User | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}))
```

**Гидратация из SSR:**
```typescript
// AuthHydration.tsx — Client Component, вызывается в (app)/layout.tsx
'use client'
export function AuthHydration({ user, children }: { user: User; children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser)
  useEffect(() => { setUser(user) }, [user, setUser])
  return <>{children}</>
}
```

---

### `ui.store.ts` — UI состояние

```typescript
import { create } from 'zustand'

type ModalName = 'create-group' | 'photo-lightbox' | 'members' | null

interface UIStore {
  // Модалы
  activeModal: ModalName
  modalPayload: unknown
  openModal: (name: NonNullable<ModalName>, payload?: unknown) => void
  closeModal: () => void

  // Создание группы — шаг
  createGroupStep: 1 | 2 | 3
  setCreateGroupStep: (step: 1 | 2 | 3) => void

  // Карта — выбранная группа
  selectedGroupId: string | null
  setSelectedGroupId: (id: string | null) => void
}

export const useUIStore = create<UIStore>((set) => ({
  activeModal: null,
  modalPayload: null,
  openModal: (name, payload) => set({ activeModal: name, modalPayload: payload }),
  closeModal: () => set({ activeModal: null, modalPayload: null }),

  createGroupStep: 1,
  setCreateGroupStep: (step) => set({ createGroupStep: step }),

  selectedGroupId: null,
  setSelectedGroupId: (id) => set({ selectedGroupId: id }),
}))
```

**Использование:**
```typescript
// Открыть модал создания группы:
const { openModal } = useUIStore()
openModal('create-group')

// Открыть lightbox с конкретным фото:
openModal('photo-lightbox', { photoId: photo.id, groupId })
```

---

## TanStack Query v5

### Настройка (в root layout)

```typescript
// app/layout.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,    // 1 минута — данные считаются свежими
      gcTime: 5 * 60 * 1000,   // 5 минут — время жизни в кэше
      retry: 1,                 // 1 повтор при ошибке
    },
  },
})
```

---

### Query Keys (строгие соглашения)

```typescript
// Всегда используй эти ключи — для корректной инвалидации:

['groups']                              // GET /groups
['group', groupId]                      // GET /groups/:id
['photos', groupId]                     // GET /groups/:id/photos (infinite)
['friends']                             // GET /friends
['user', 'me']                          // GET /users/me
['group', groupId, 'members']           // GET /groups/:id/members
```

---

### Примеры запросов

```typescript
// Список групп
export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => apiClient.get<PaginatedResponse<Group>>('/groups'),
  })
}

// Детали группы
export function useGroup(groupId: string) {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: () => apiClient.get<GroupDetail>(`/groups/${groupId}`),
    enabled: !!groupId,
  })
}

// Фото с infinite scroll
export function usePhotos(groupId: string) {
  return useInfiniteQuery({
    queryKey: ['photos', groupId],
    queryFn: ({ pageParam = 1 }) =>
      apiClient.get<PaginatedResponse<Photo>>(
        `/groups/${groupId}/photos?page=${pageParam}&limit=20`
      ),
    getNextPageParam: (lastPage) => {
      const { page, limit, total } = lastPage
      return page * limit < total ? page + 1 : undefined
    },
    initialPageParam: 1,
  })
}
```

---

### Мутации

```typescript
// Создание группы
export function useCreateGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateGroupDto) =>
      apiClient.post<Group>('/groups', data),

    onSuccess: () => {
      // Инвалидируем список групп
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },

    onError: (error) => {
      toast.error('Не удалось создать группу')
    },
  })
}

// Загрузка фото (confirm)
export function useConfirmPhotoUpload(groupId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ConfirmUploadDto) =>
      apiClient.post<Photo>(`/groups/${groupId}/photos/confirm`, data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos', groupId] })
    },
  })
}
```

---

### Оптимистичные обновления

Применяем когда операция быстрая и мы уверены в успехе (например, лайк или смена имени):

```typescript
// Пример: оптимистичное обновление имени профиля
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateUserDto) => apiClient.patch<User>('/users/me', data),

    onMutate: async (newData) => {
      // Отменяем текущие запросы
      await queryClient.cancelQueries({ queryKey: ['user', 'me'] })

      // Сохраняем предыдущее состояние
      const previous = queryClient.getQueryData<User>(['user', 'me'])

      // Оптимистично обновляем
      queryClient.setQueryData(['user', 'me'], (old: User) => ({ ...old, ...newData }))

      return { previous }
    },

    onError: (_, __, context) => {
      // Откат при ошибке
      queryClient.setQueryData(['user', 'me'], context?.previous)
      toast.error('Не удалось сохранить')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] })
    },
  })
}
```

---

### 401 Handler (глобальный)

```typescript
// lib/api-client.ts
async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    // Сбросить user в Zustand + redirect
    useAuthStore.getState().logout()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message ?? 'Something went wrong')
  }
  return res.json()
}
```
