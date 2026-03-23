# Yasme Travel 2.0 — Claude Code Instructions

> Приложение для совместного хранения фотографий с путешествий. Друзья создают группы (привязанные к географической точке), загружают фото и просматривают поездки на карте. PWA, mobile-first.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Platform | PWA (mobile-first) |
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 |
| Backend | Node.js + Fastify + TypeScript |
| Database | PostgreSQL 16 + Prisma ORM |
| Auth | Yandex ID OAuth2 → JWT (httpOnly cookies) |
| Photo Storage | Yandex Object Storage (S3-compatible) |
| Maps | Yandex Maps JavaScript API v3 |
| UI Components | shadcn/ui (Radix UI + Tailwind) |
| Animations | Framer Motion |
| Icons | Lucide React |
| State (client) | Zustand (UI) + TanStack Query v5 (server state) |
| Deployment | Yandex Cloud VM + Docker Compose + Nginx |
| Monorepo | pnpm workspaces + Turborepo |

---

## Monorepo Structure

```
yasme-travel-2.0/
├── apps/
│   ├── frontend/        # Next.js PWA — порт 3000
│   └── backend/         # Fastify REST API — порт 3001
├── packages/
│   └── shared/          # Общие TypeScript типы (@yasme/shared)
├── docs/                # Вся документация (единственный источник истины)
├── CLAUDE.md            # Этот файл
├── docker-compose.yml
└── .env.example
```

---

## Key Commands

```bash
# Запуск БД локально
docker compose up postgres -d

# Запуск всего в dev-режиме
pnpm dev                         # turborepo: frontend + backend параллельно

# Backend только
pnpm --filter backend dev        # порт 3001

# Frontend только
pnpm --filter frontend dev       # порт 3000

# Prisma
pnpm db:migrate                  # создать и применить миграцию
pnpm db:generate                 # обновить Prisma Client
pnpm db:studio                   # открыть Prisma Studio

# Установить shadcn/ui компонент
cd apps/frontend && npx shadcn@latest add button

# Сборка всего
pnpm build
```

---

## Code Conventions

- **TypeScript strict mode** везде — нет `any`, нет `@ts-ignore` без комментария
- **Именование файлов**: компоненты — `PascalCase.tsx`, утилиты/хуки — `camelCase.ts`
- **Импорт shared типов**: `import type { Group } from '@yasme/shared'`
- **Server Components по умолчанию** в Next.js — `'use client'` только когда необходимо
- **Server state** → TanStack Query; **UI state** → Zustand
- **Стили** → Tailwind utility classes + shadcn/ui компоненты; никакого CSS-in-JS
- **Ошибки API**: всегда форма `{ error: string, message: string, statusCode: number }`
- **Env vars**: секреты только на бэкенде; фронтенд получает только `NEXT_PUBLIC_*`

---

## Architecture Decisions (краткое)

- `storageKey` в БД хранит S3-ключ объекта, **не полный URL** — URL строится на лету
- Загрузка фото: presign → прямой PUT в S3 → confirm (бэкенд не обрабатывает бинарные данные)
- Cookie same-origin в dev: Next.js `rewrites` проксирует `/api/*` → `backend:3001`
- Yandex Maps: всегда `dynamic(() => import(...), { ssr: false })` — браузерный SDK
- JWT срок жизни: 7 дней, нет refresh token в MVP (пере-аутентификация по истечении)

---

## Documentation Map

| Файл | Содержимое |
|---|---|
| `docs/README.md` | Обзор проекта, quick start |
| `docs/user-flows.md` | ⭐ Все пользовательские пути (UC-01..UC-10) |
| `docs/architecture.md` | Полная архитектура, диаграммы |
| `docs/api.md` | REST API reference |
| `docs/database.md` | Схема БД, Prisma schema |
| `docs/auth-flow.md` | Yandex OAuth2 пошагово |
| `docs/photo-upload.md` | Presigned URL flow |
| `docs/design-system.md` | Дизайн-токены, компоненты, мокапы |
| `docs/deployment.md` | Docker, Yandex Cloud, Nginx |
| `apps/frontend/CLAUDE.md` | Frontend-специфичные инструкции |
| `apps/backend/CLAUDE.md` | Backend-специфичные инструкции |

---

## Context7 MCP

Для получения актуальной документации библиотек (shadcn/ui, Next.js, Framer Motion, Prisma) настроен Context7 MCP. При реализации компонентов добавляй `use context7` в запрос для подтягивания актуальных API.

```jsonc
// .claude/settings.json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```
