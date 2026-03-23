# Pages — Маршруты и страницы

---

## Карта маршрутов

| Path | Файл | Auth | Тип компонента |
|---|---|---|---|
| `/login` | `(auth)/login/page.tsx` | Нет | Server |
| `/groups` | `(app)/groups/page.tsx` | Да | Client |
| `/groups/:id` | `(app)/groups/[id]/page.tsx` | Да | Client |
| `/map` | `(app)/map/page.tsx` | Да | Client |
| `/friends` | `(app)/friends/page.tsx` | Да | Client |
| `/profile` | `(app)/profile/page.tsx` | Да | Client |
| `/api/auth/callback` | `api/auth/callback/route.ts` | Нет | Route Handler |

---

## Route Groups

### `(auth)` — публичные маршруты
Доступны без авторизации. Нет BottomNav. Нет проверки сессии.

```
app/
└── (auth)/
    └── login/
        └── page.tsx        # Страница входа
```

### `(app)` — защищённые маршруты
Все маршруты внутри защищены auth guard в `layout.tsx`.

```
app/
└── (app)/
    ├── layout.tsx           # ⚠️ Auth guard + AppShell + BottomNav
    ├── groups/
    │   ├── page.tsx
    │   └── [id]/
    │       ├── page.tsx
    │       ├── loading.tsx  # Skeleton placeholder
    │       └── not-found.tsx
    ├── map/page.tsx
    ├── friends/page.tsx
    └── profile/page.tsx
```

---

## Auth Guard — `(app)/layout.tsx`

```typescript
// Server Component — выполняется на сервере при каждом запросе
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  // Нет cookie → сразу редирект, без запроса к бэкенду
  if (!token) redirect('/login')

  // Проверяем валидность токена
  const res = await fetch(`${process.env.INTERNAL_API_URL}/api/v1/auth/me`, {
    headers: { Cookie: `token=${token}` },
    cache: 'no-store',
  })

  if (!res.ok) redirect('/login')

  const user: User = await res.json()

  return (
    <AuthHydration user={user}>  {/* гидратация Zustand auth.store */}
      <AppShell>
        {children}
        <BottomNav />
        <CreateGroupModal />     {/* монтирован глобально */}
      </AppShell>
    </AuthHydration>
  )
}
```

**`INTERNAL_API_URL`** — на сервере (SSR) обращаемся к бэкенду напрямую по Docker hostname, не через public URL:
```
INTERNAL_API_URL=http://backend:3001   # в Docker
INTERNAL_API_URL=http://localhost:3001  # локально без Docker
```

---

## Страницы

### `/login` — `(auth)/login/page.tsx`

**Тип:** Server Component
**UC:** UC-01

```
┌─────────────────────┐
│   [логотип]         │
│   Yasme Travel      │
│   Путешествия       │
│   с друзьями        │
│                     │
│  [Войти через       │
│   Яндекс]          │
└─────────────────────┘
```

- Редирект на `/groups` если уже авторизован (проверка cookie на сервере)
- Нет других элементов

---

### `/groups` — `(app)/groups/page.tsx`

**Тип:** Client Component (TanStack Query)
**UC:** UC-03, UC-04

```
┌─────────────────────┐
│  Мои поездки   [+]  │  ← sticky header
│─────────────────────│
│  [GroupCard]        │  ← список
│  [GroupCard]        │
│  [GroupCard]        │
│                     │
│              [+FAB] │  ← FAB создания группы
│  [Nav Bar]          │
└─────────────────────┘
```

- `useQuery(['groups'])` → список групп
- Loading: 3 GroupCardSkeleton
- Empty: иллюстрация + "Создай первую поездку" + кнопка

---

### `/groups/[id]` — `(app)/groups/[id]/page.tsx`

**Тип:** Client Component
**UC:** UC-04, UC-05, UC-10

- `useQuery(['group', id])` → детали + участники
- `useInfiniteQuery(['photos', id])` → масonry галерея
- Loading: `loading.tsx` с header skeleton + grid skeleton

---

### `/map` — `(app)/map/page.tsx`

**Тип:** Client Component
**UC:** UC-06

- `useQuery(['groups'])` → координаты для маркеров
- `<YandexMap>` занимает весь viewport
- BottomNav поверх карты (z-index: 10)

---

### `/friends` — `(app)/friends/page.tsx`

**Тип:** Client Component
**UC:** UC-07

- `useQuery(['friends'])` → список пользователей
- Клиентская фильтрация по поиску
- Loading: 5 FriendCardSkeleton

---

### `/profile` — `(app)/profile/page.tsx`

**Тип:** Client Component
**UC:** UC-08, UC-09

---

## Loading и Error состояния

### `loading.tsx` (Next.js автоматический)

Создать для каждого маршрута с тяжёлой загрузкой:

```typescript
// (app)/groups/[id]/loading.tsx
export default function GroupDetailLoading() {
  return (
    <div>
      <Skeleton className="h-48 w-full" />  {/* header image */}
      <div className="grid grid-cols-2 gap-1 p-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    </div>
  )
}
```

### `not-found.tsx`

```typescript
// (app)/groups/[id]/not-found.tsx
export default function GroupNotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <p className="text-2xl mb-2">Поездка не найдена</p>
      <p className="text-secondary mb-6">Возможно, она была удалена</p>
      <Button asChild>
        <Link href="/groups">Вернуться к списку</Link>
      </Button>
    </div>
  )
}
```

### `error.tsx` (глобальный)

```typescript
// (app)/error.tsx
'use client'
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <p className="text-xl mb-4">Что-то пошло не так</p>
      <Button onClick={reset}>Попробовать снова</Button>
    </div>
  )
}
```
