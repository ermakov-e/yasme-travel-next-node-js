# Frontend — Claude Code Instructions

> Next.js 15 PWA, mobile-first. Стиль: яркий/путешествия (Orange + Pink palette, full-bleed photos).

---

## Структура

```
apps/frontend/src/
├── app/
│   ├── (auth)/login/page.tsx          # Публичный маршрут
│   ├── (app)/                         # Защищённые маршруты
│   │   ├── layout.tsx                 # ⚠️ Server Component: auth guard + BottomNav
│   │   ├── groups/page.tsx
│   │   ├── groups/[id]/page.tsx
│   │   ├── map/page.tsx
│   │   ├── friends/page.tsx
│   │   └── profile/page.tsx
│   └── api/auth/callback/route.ts    # Не трогать — OAuth callback
├── components/
│   ├── ui/                            # shadcn/ui (сгенерированные, можно редактировать)
│   ├── layout/                        # BottomNav, AppShell, PageTransition
│   ├── groups/                        # GroupCard, CreateGroupModal, PhotoGallery
│   ├── map/                           # YandexMap (dynamic, no ssr)
│   └── auth/                          # YandexLoginButton
├── hooks/                             # useAuth, useGroups, usePresignedUpload
├── lib/
│   ├── api-client.ts                  # fetch wrapper
│   └── cn.ts                          # clsx + tailwind-merge
└── store/
    ├── auth.store.ts                  # Zustand: текущий пользователь
    └── ui.store.ts                    # Zustand: модалы, UI state
```

---

## Server vs Client Components

**По умолчанию — Server Component** (нет `'use client'`).

`'use client'` добавляем только если компонент:
- Использует `useState` / `useEffect` / другие хуки
- Использует event handlers (`onClick`, `onChange`)
- Использует `useRouter` / `useParams` / `useSearchParams`
- Использует TanStack Query (`useQuery`, `useMutation`)
- Использует Zustand store

```typescript
// ✅ Server Component (нет директивы)
export default async function GroupsPage() {
  // Данные можно фетчить напрямую
  return <GroupsList />
}

// ✅ Client Component (нужен для интерактивности)
'use client'
export function GroupCard({ group }: { group: Group }) {
  const router = useRouter()
  return <motion.div onClick={() => router.push(`/groups/${group.id}`)} />
}
```

---

## Загрузка данных

**Всегда через TanStack Query** — не через `useEffect + fetch`:

```typescript
// ✅ Правильно
'use client'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function GroupsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => apiClient.get<PaginatedResponse<Group>>('/groups'),
  })

  if (isLoading) return <GroupsListSkeleton />
  return <>{data?.data.map(g => <GroupCard key={g.id} group={g} />)}</>
}

// ❌ Неправильно
useEffect(() => {
  fetch('/api/v1/groups').then(...)
}, [])
```

### Query Keys (соблюдать строго)

```typescript
['groups']                           // список групп
['group', groupId]                   // детали группы
['photos', groupId]                  // фото группы
['photos', groupId, { page: N }]     // пагинированные фото
['friends']                          // список пользователей
['user', 'me']                       // текущий пользователь
```

### Инвалидация после мутации

```typescript
const queryClient = useQueryClient()

// После создания группы:
queryClient.invalidateQueries({ queryKey: ['groups'] })

// После загрузки фото:
queryClient.invalidateQueries({ queryKey: ['photos', groupId] })
```

---

## Добавить shadcn/ui компонент

```bash
# Из папки apps/frontend:
npx shadcn@latest add button
npx shadcn@latest add sheet
npx shadcn@latest add avatar
npx shadcn@latest add skeleton
npx shadcn@latest add badge
npx shadcn@latest add dialog
npx shadcn@latest add sonner   # toast уведомления
```

Компоненты появятся в `src/components/ui/`. Можно свободно редактировать.

---

## Яндекс.Карты — Правила

```typescript
// ✅ Всегда dynamic import, нет SSR
import dynamic from 'next/dynamic'

const YandexMap = dynamic(() => import('@/components/map/YandexMap'), {
  ssr: false,
  loading: () => <div className="h-full bg-gray-100 animate-pulse" />,
})

// ✅ Монтируем ОДИН РАЗ, скрываем через CSS (не unmount!)
// В layout карты: display: 'none' когда не активна
```

---

## Framer Motion — Правила

```typescript
import { motion, AnimatePresence } from 'framer-motion'

// Page transition wrapper (использовать на каждой странице):
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.25, ease: 'easeOut' }}
>

// Карточки (tap feedback):
<motion.div whileTap={{ scale: 0.97 }}>

// FAB:
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
```

---

## Изображения

```typescript
// Всегда next/image, никогда <img> для контента
import Image from 'next/image'

<Image
  src={`${process.env.NEXT_PUBLIC_YOS_PUBLIC_BASE_URL}/${photo.storageKey}`}
  alt={photo.caption ?? 'Фото'}
  fill
  className="object-cover"
  sizes="(max-width: 640px) 50vw, 33vw"
/>
```

---

## Соглашения именования

| Тип | Пример |
|---|---|
| Компонент | `GroupCard.tsx`, `PhotoGallery.tsx` |
| Страница | `page.tsx` (Next.js convention) |
| Хук | `useGroups.ts`, `usePresignedUpload.ts` |
| Store | `auth.store.ts`, `ui.store.ts` |
| Утилита | `api-client.ts`, `cn.ts` |
| Тип | `import type { Group } from '@yasme/shared'` |

---

## Дополнительная документация

- [components.md](./docs/components.md) — каталог компонентов
- [pages.md](./docs/pages.md) — маршруты и auth guard
- [state.md](./docs/state.md) — Zustand + TanStack Query
- [animations.md](./docs/animations.md) — Framer Motion рецепты
- [../docs/design-system.md](../docs/design-system.md) — дизайн-система
- [../docs/user-flows.md](../docs/user-flows.md) — пользовательские сценарии
