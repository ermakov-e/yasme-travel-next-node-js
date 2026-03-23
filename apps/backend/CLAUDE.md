# Backend — Claude Code Instructions

> Fastify REST API. TypeScript strict. Архитектура: plugins → routes → services.

---

## Структура

```
apps/backend/src/
├── app.ts                    # Entrypoint: создаёт и запускает сервер
├── server.ts                 # Fastify instance, регистрация плагинов и роутов
├── config/
│   └── env.ts                # Типизированные env vars через Zod
├── plugins/
│   ├── auth.plugin.ts        # ⚠️ JWT cookie декодирование + декорация request.user
│   ├── cors.plugin.ts        # CORS настройка
│   └── prisma.plugin.ts      # Prisma client как fastify.prisma
├── routes/
│   ├── auth/index.ts         # /auth/yandex, /auth/callback, /auth/logout, /auth/me
│   ├── groups/index.ts       # /groups CRUD + members
│   ├── photos/index.ts       # /groups/:id/photos presign + confirm + list
│   ├── users/index.ts        # /users/me
│   └── friends/index.ts      # /friends
└── services/
    ├── auth.service.ts       # Yandex token exchange, JWT sign/verify
    ├── storage.service.ts    # Yandex Object Storage (S3) presigned URLs
    └── group.service.ts      # Бизнес-логика групп
```

---

## Порядок регистрации плагинов

```typescript
// server.ts — СТРОГО в этом порядке:
1. fastify-cookie          // cookie parsing (до auth plugin)
2. @fastify/cors           // CORS headers
3. prisma.plugin           // fastify.prisma decorator
4. auth.plugin             // request.user decorator (зависит от cookie)
5. routes                  // роуты (зависят от request.user)
```

---

## Добавить новый роут

1. Создай файл `src/routes/{resource}/index.ts`
2. Зарегистрируй в `server.ts`:

```typescript
// server.ts
import myRoutes from './routes/my-resource/index.js'
fastify.register(myRoutes, { prefix: '/api/v1' })
```

3. В файле роута:
```typescript
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

const myRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/resource', {
    preHandler: [fastify.requireAuth],  // ← добавить если нужна auth
    schema: {
      response: { 200: MyResponseSchema }
    }
  }, async (request, reply) => {
    const user = request.user  // ← доступен после requireAuth
    // ...
  })
}
export default myRoutes
```

---

## Авторизация — requireAuth

```typescript
// Применение к отдельному роуту:
fastify.get('/protected', {
  preHandler: [fastify.requireAuth],
}, handler)

// Применение ко всем роутам плагина:
fastify.addHook('preHandler', fastify.requireAuth)
```

После `requireAuth` доступен `request.user`:
```typescript
interface RequestUser {
  sub: string        // user.id в нашей БД
  yandexId: string
  name: string
  avatarUrl: string | null
}
```

---

## Типизация запросов (Zod)

```typescript
import { z } from 'zod'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

const CreateGroupSchema = z.object({
  name: z.string().min(2).max(100),
  coverKey: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().optional(),
  memberIds: z.array(z.string().uuid()).optional().default([]),
})

const routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post('/groups', {
    preHandler: [fastify.requireAuth],
    schema: {
      body: CreateGroupSchema,
      response: {
        201: GroupResponseSchema,
        400: ErrorSchema,
      },
    },
  }, async (request, reply) => {
    const data = request.body  // ← автоматически типизировано из schema
    // ...
  })
}
```

---

## Обработка ошибок

```typescript
// Стандартные HTTP ошибки через @fastify/sensible:
throw fastify.httpErrors.notFound('Group not found')
throw fastify.httpErrors.forbidden('Only owner can do this')
throw fastify.httpErrors.badRequest('Invalid data')
throw fastify.httpErrors.conflict('User already in group')

// Все ошибки автоматически конвертируются в формат:
// { error: "NOT_FOUND", message: "...", statusCode: 404 }
```

---

## Prisma через fastify.prisma

```typescript
// В обработчике роута:
const group = await fastify.prisma.group.findUnique({
  where: { id: params.id },
  include: { members: { include: { user: true } } },
})

if (!group) throw fastify.httpErrors.notFound('Group not found')
```

---

## Соглашения

- **Бизнес-логика** в `services/`, не в `routes/`
- **Роуты** — тонкий слой: валидация + вызов сервиса + формирование ответа
- **Импорты** с `.js` расширением (Node ESM): `import { foo } from './foo.js'`
- **Env vars** только через `config/env.ts` (типизировано, с валидацией)

---

## Дополнительная документация

- [docs/routes.md](./docs/routes.md) — паттерны маршрутов
- [docs/prisma.md](./docs/prisma.md) — Prisma паттерны и миграции
- [docs/services.md](./docs/services.md) — сервисный слой, S3
- [../docs/api.md](../docs/api.md) — REST API reference
- [../docs/auth-flow.md](../docs/auth-flow.md) — Yandex OAuth2
- [../docs/database.md](../docs/database.md) — схема БД
