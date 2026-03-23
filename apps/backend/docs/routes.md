# Routes — Паттерны маршрутов Fastify

---

## Структура файла роута

```typescript
// routes/groups/index.ts
import { z } from 'zod'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { groupService } from '../../services/group.service.js'

// ── Zod schemas ──────────────────────────────────────────────
const CreateGroupBody = z.object({
  name: z.string().min(2).max(100),
  coverKey: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().optional(),
  memberIds: z.array(z.string().uuid()).default([]),
})

const GroupResponse = z.object({
  id: z.string(),
  name: z.string(),
  coverUrl: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
  address: z.string().nullable(),
  ownerId: z.string(),
  memberCount: z.number(),
  photoCount: z.number(),
  createdAt: z.string(),
})

// ── Плагин ───────────────────────────────────────────────────
const groupRoutes: FastifyPluginAsyncZod = async (fastify) => {

  // Все роуты в этом плагине требуют авторизации:
  fastify.addHook('preHandler', fastify.requireAuth)

  // GET /groups
  fastify.get('/groups', {
    schema: {
      querystring: z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      }),
      response: {
        200: z.object({
          data: z.array(GroupResponse),
          total: z.number(),
          page: z.number(),
          limit: z.number(),
        }),
      },
    },
  }, async (request, reply) => {
    const { page, limit } = request.query
    const userId = request.user.sub

    const result = await groupService.getUserGroups(fastify.prisma, userId, { page, limit })
    return reply.send(result)
  })

  // POST /groups
  fastify.post('/groups', {
    schema: {
      body: CreateGroupBody,
      response: {
        201: GroupResponse,
        400: ErrorSchema,
      },
    },
  }, async (request, reply) => {
    const group = await groupService.createGroup(
      fastify.prisma,
      fastify.s3,
      request.user.sub,
      request.body
    )
    return reply.status(201).send(group)
  })

  // GET /groups/:id
  fastify.get('/groups/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      response: { 200: GroupDetailResponse, 404: ErrorSchema },
    },
  }, async (request, reply) => {
    const group = await groupService.getGroupById(
      fastify.prisma,
      request.params.id,
      request.user.sub
    )
    if (!group) throw fastify.httpErrors.notFound('Group not found')
    return reply.send(group)
  })

}

export default groupRoutes
```

---

## Паттерн CRUD роута

| Действие | Метод | Path | Auth | Кто |
|---|---|---|---|---|
| Список | GET | `/resource` | requireAuth | Любой авт. |
| Создание | POST | `/resource` | requireAuth | Любой авт. |
| Детали | GET | `/resource/:id` | requireAuth | Члены |
| Обновление | PATCH | `/resource/:id` | requireAuth | Владелец |
| Удаление | DELETE | `/resource/:id` | requireAuth | Владелец |

---

## Проверка владельца (Authorization)

```typescript
fastify.patch('/groups/:id', {
  preHandler: [fastify.requireAuth],
  // ...
}, async (request, reply) => {
  const group = await fastify.prisma.group.findUnique({
    where: { id: request.params.id }
  })

  if (!group) throw fastify.httpErrors.notFound('Group not found')

  // Проверка: только владелец может редактировать
  if (group.ownerId !== request.user.sub) {
    throw fastify.httpErrors.forbidden('Only group owner can update it')
  }

  // ...
})
```

---

## Проверка членства в группе

```typescript
async function assertGroupMember(
  prisma: PrismaClient,
  groupId: string,
  userId: string,
  fastify: FastifyInstance
) {
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } }
  })
  if (!member) throw fastify.httpErrors.forbidden('You are not a member of this group')
  return member
}
```

---

## Пагинация — стандартный паттерн

```typescript
async function paginate<T>(
  prisma: PrismaClient,
  model: any,
  where: object,
  page: number,
  limit: number,
  include?: object,
): Promise<{ data: T[]; total: number; page: number; limit: number }> {
  const [data, total] = await Promise.all([
    model.findMany({
      where,
      include,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    model.count({ where }),
  ])
  return { data, total, page, limit }
}
```

---

## Формат ошибок

```typescript
// Все ошибки через @fastify/sensible:
throw fastify.httpErrors.badRequest('Validation failed')
throw fastify.httpErrors.unauthorized('Invalid token')
throw fastify.httpErrors.forbidden('Access denied')
throw fastify.httpErrors.notFound('Resource not found')
throw fastify.httpErrors.conflict('Already exists')
throw fastify.httpErrors.internalServerError('Unexpected error')
```

Fastify автоматически форматирует в:
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Resource not found"
}
```

Глобальный error handler в `server.ts` переформатирует в наш стандарт:
```json
{
  "error": "NOT_FOUND",
  "message": "Resource not found",
  "statusCode": 404
}
```
