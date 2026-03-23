# Architecture — Архитектура системы

---

## Диаграмма системы

```
┌─────────────────────────────────────────────────────────────────┐
│                        КЛИЕНТ (браузер)                         │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │            Next.js PWA (порт 3000)                        │  │
│  │  App Router · shadcn/ui · Framer Motion · TanStack Query  │  │
│  └────────────────────────────┬──────────────────────────────┘  │
│                               │  fetch (credentials: include)   │
└───────────────────────────────┼─────────────────────────────────┘
                                │ /api/* (proxied through Next.js rewrites)
                                ▼
┌───────────────────────────────────────────────────────────────┐
│                    Fastify Backend (порт 3001)                 │
│  Prisma ORM · JWT auth plugin · Zod validation · S3 service   │
│                               │                               │
│              ┌────────────────┼───────────────┐               │
│              ▼                ▼               ▼               │
│       ┌─────────────┐  ┌──────────┐  ┌──────────────────┐    │
│       │ PostgreSQL  │  │  Yandex  │  │  Yandex Object   │    │
│       │     16      │  │  OAuth   │  │  Storage (S3)    │    │
│       │  (Docker)   │  │  API     │  │                  │    │
│       └─────────────┘  └──────────┘  └──────────────────┘    │
└───────────────────────────────────────────────────────────────┘
                                                    ▲
                                         Прямой PUT │ (presigned URL)
                                                    │
                                            [Браузер клиента]
```

**Ключевые потоки:**
1. **Auth**: Browser → Yandex OAuth → Backend (JWT cookie) → Browser
2. **API calls**: Browser → Next.js rewrite → Fastify → PostgreSQL
3. **Photo upload**: Browser → Backend (presign) → Browser → S3 (прямой PUT) → Backend (confirm)
4. **Maps**: Browser → Yandex Maps JS API (прямо, без бэкенда)

---

## Tech Stack — Обоснование

| Layer | Выбор | Почему |
|---|---|---|
| **Frontend** | Next.js 15 App Router | SSR для session restore, RSC для меньшего bundle, встроенный роутинг |
| **UI** | shadcn/ui + Tailwind v4 | Компоненты в кодовой базе (не npm-пакет), Radix accessibility, полный контроль |
| **Animations** | Framer Motion | Layout animations, shared transitions, spring physics — лучший в экосистеме React |
| **Backend** | Fastify | В 2–3x быстрее Express, TypeScript-first, plugin система |
| **ORM** | Prisma | Type-safe queries, миграции, отличный DX |
| **DB** | PostgreSQL | Реляционные данные (users-groups-members), ACID, надёжность |
| **Auth** | Yandex ID OAuth2 | Российские пользователи = аккаунт Яндекса, телефон уже привязан |
| **Storage** | Yandex Object Storage | S3-совместимый, серверы в России, дёшево, хорошо интегрируется с YC |
| **Maps** | Яндекс.Карты JS API v3 | Лучшее покрытие России, геокодер для поиска адресов |
| **Monorepo** | pnpm + Turborepo | Общие типы, кэширование билдов, быстрая установка зависимостей |
| **State** | TanStack Query + Zustand | Query для server state (кэш, revalidation), Zustand для UI state |

---

## Монорепо структура

```
yasme-travel-2.0/
├── apps/
│   ├── frontend/                    # Next.js PWA
│   │   ├── src/app/
│   │   │   ├── (auth)/login/        # Публичные маршруты
│   │   │   ├── (app)/               # Защищённые маршруты (auth guard в layout)
│   │   │   │   ├── layout.tsx       # Server Component: проверка сессии
│   │   │   │   ├── groups/
│   │   │   │   ├── map/
│   │   │   │   ├── friends/
│   │   │   │   └── profile/
│   │   │   └── api/auth/callback/   # OAuth callback handler
│   │   ├── src/components/
│   │   │   ├── ui/                  # shadcn/ui компоненты
│   │   │   ├── layout/              # BottomNav, AppShell
│   │   │   ├── groups/              # GroupCard, CreateGroupModal, PhotoGallery
│   │   │   └── map/                 # YandexMap, GroupMarker
│   │   ├── src/hooks/               # useAuth, useGroups, usePresignedUpload
│   │   └── src/store/               # Zustand: auth.store, ui.store
│   │
│   └── backend/                     # Fastify REST API
│       ├── src/
│       │   ├── plugins/             # auth, cors, prisma
│       │   ├── routes/              # auth, groups, photos, users, friends
│       │   └── services/            # auth.service, storage.service, group.service
│       └── prisma/
│           └── schema.prisma
│
├── packages/
│   └── shared/                      # @yasme/shared
│       └── src/types/               # User, Group, Photo, API contracts
│
└── docs/                            # Документация
```

---

## Sprint Sequence

| Sprint | Что реализуем | Результат |
|---|---|---|
| **1 — Foundation** | Монорепо, shared types, Docker, Fastify scaffold, Next.js scaffold + shadcn/ui | `docker compose up` поднимает postgres; `/api/v1/auth/me` → 401 |
| **2 — Auth** | Yandex OAuth, JWT cookies, login page, session restore, auth guard | Можно войти через Яндекс и попасть на `/groups` |
| **3 — Groups Core** | Groups CRUD, GroupCard, CreateGroupModal (3 шага + Яндекс.Карты), Friends API | Можно создать группу с локацией и участниками |
| **4 — Photos** | S3 presigned URLs, upload flow, GroupDetail page, masonry gallery | Можно загружать и просматривать фото |
| **5 — Map + Profile + PWA** | Map page, markers, Profile page, avatar upload, PWA manifest | Всё MVP готово, устанавливается на телефон |

---

## Риски и митигации

| Риск | Митигация |
|---|---|
| **Яндекс.Карты — нет SSR** | `dynamic(..., { ssr: false })` + `<Script strategy="lazyOnload">`. Монтируется один раз, скрывается через CSS, не unmount. |
| **Presigned URL + phantom records** | В `/confirm`: `S3.headObject(storageKey)` перед INSERT — проверяем, что объект реально загружен. |
| **Orphaned temp cover photo** | `temp/` prefix + S3 lifecycle rule (7 дней TTL). При создании группы бэкенд делает `copyObject` → `groups/{id}/cover.*`. |
| **Cookie cross-origin в dev** | Next.js `rewrites` проксирует `/api/*` → `backend:3001`. Браузер видит один origin. |
| **Яндекс OAuth redirect URI** | Зарегистрировать оба URI: localhost и prod. Env var `YANDEX_REDIRECT_URI` выбирает нужный. |
| **Яндекс.Карты free tier** | 1000 загрузок/день → монтируем карту один раз. `display: none` вместо unmount при переключении табов. |
| **Mobile Safari cookies** | Весь трафик через Nginx на одном домене. Fastify-порт напрямую не открыт. |

---

## Взаимодействие Frontend ↔ Backend

```
Next.js (3000)                          Fastify (3001)
     │                                        │
     │  Все запросы идут через Next.js rewrites:
     │  /api/* → http://backend:3001/api/*   │
     │                                        │
     │  GET /api/v1/auth/me ─────────────────>│
     │  { cookie: token=<jwt> }               │
     │  <─────────── 200 { user } ───────────│
     │                                        │
     │  Server Components (SSR):              │
     │  Запросы с headers.cookie ────────────>│
     │  Результат → RSC payload               │
     │                                        │
     │  Client Components:                    │
     │  fetch с credentials: 'include' ──────>│
     │  TanStack Query кэширует ответ         │
```
