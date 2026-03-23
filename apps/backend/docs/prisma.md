# Prisma — Паттерны и миграции

---

## Команды

```bash
# Находясь в корне монорепо:

# Создать и применить новую миграцию (dev)
pnpm db:migrate
# → npx prisma migrate dev --name <название>

# Обновить Prisma Client после изменения schema
pnpm db:generate
# → npx prisma generate

# Применить миграции на production (без dev артефактов)
npx prisma migrate deploy

# Открыть визуальный редактор БД
pnpm db:studio
# → npx prisma studio (открывает браузер на localhost:5555)

# Сбросить БД и применить все миграции заново (только dev!)
npx prisma migrate reset
```

---

## Добавить новую модель

1. Добавь модель в `apps/backend/prisma/schema.prisma`
2. Запусти `pnpm db:migrate`
3. Введи название миграции (например: `add-photo-likes`)
4. Prisma создаст файл в `prisma/migrations/`
5. Запусти `pnpm db:generate` (обновит типы)

---

## Паттерны запросов

### Найти по ID с проверкой существования

```typescript
const group = await fastify.prisma.group.findUnique({
  where: { id: groupId },
})
if (!group) throw fastify.httpErrors.notFound('Group not found')
```

### Найти с включёнными связями

```typescript
const group = await fastify.prisma.group.findUnique({
  where: { id: groupId },
  include: {
    members: {
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true }  // только нужные поля
        }
      },
      orderBy: { joinedAt: 'asc' }
    },
    _count: {
      select: { photos: true }  // COUNT без загрузки всех фото
    }
  }
})
```

### Пагинация

```typescript
const [groups, total] = await fastify.prisma.$transaction([
  fastify.prisma.group.findMany({
    where: {
      members: { some: { userId } }  // группы, где пользователь — участник
    },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { photos: true, members: true } }
    }
  }),
  fastify.prisma.group.count({
    where: { members: { some: { userId } } }
  })
])
```

### Upsert (создать или обновить)

```typescript
// Используется при auth — создаём пользователя если нет, обновляем если есть
const user = await fastify.prisma.user.upsert({
  where: { yandexId: yandexProfile.id },
  update: {
    name: yandexProfile.real_name,
    avatarUrl: yandexProfile.default_avatar_id
      ? `https://avatars.yandex.net/get-yapic/${yandexProfile.default_avatar_id}/islands-200`
      : null,
  },
  create: {
    yandexId: yandexProfile.id,
    name: yandexProfile.real_name,
    phone: yandexProfile.default_phone?.number ?? null,
    avatarUrl: ...,
  }
})
```

### Транзакция (несколько операций атомарно)

```typescript
// Создание группы + добавление владельца как OWNER + копирование обложки:
const [group] = await fastify.prisma.$transaction(async (tx) => {
  const group = await tx.group.create({
    data: {
      name, lat, lng, address,
      coverKey: null,  // обновим после copy
      ownerId: userId,
    }
  })

  // Добавляем владельца
  await tx.groupMember.create({
    data: { groupId: group.id, userId, role: 'OWNER' }
  })

  // Добавляем приглашённых участников
  if (memberIds.length > 0) {
    await tx.groupMember.createMany({
      data: memberIds.map(uid => ({ groupId: group.id, userId: uid, role: 'MEMBER' })),
      skipDuplicates: true,
    })
  }

  return [group]
})
```

### Bulk create (createMany)

```typescript
await fastify.prisma.groupMember.createMany({
  data: userIds.map(userId => ({ groupId, userId, role: 'MEMBER' as const })),
  skipDuplicates: true,  // игнорировать если уже в группе
})
```

### Select (только нужные поля)

```typescript
// Вместо include всей связи — select только нужное:
const users = await fastify.prisma.user.findMany({
  select: {
    id: true,
    name: true,
    avatarUrl: true,
    phone: true,
  },
  where: { NOT: { id: currentUserId } },
  orderBy: { name: 'asc' },
})
```

---

## Преобразование результатов

Prisma возвращает `Date` объекты — конвертируем в ISO string для JSON:

```typescript
// Fastify сериализует Date → ISO string автоматически ✅
// Если нужно вручную:
const result = {
  ...group,
  createdAt: group.createdAt.toISOString(),
}
```

`Decimal` (если используешь в schema) → `.toString()`:
```typescript
// Для Float (lat/lng) конвертация не нужна — обычный JS number
```

---

## Seed данные (для разработки)

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Тестовые пользователи
  const user1 = await prisma.user.upsert({
    where: { yandexId: 'test-user-1' },
    update: {},
    create: {
      yandexId: 'test-user-1',
      name: 'Иван Тестов',
      phone: '+79001234567',
    }
  })

  // Тестовая группа
  await prisma.group.upsert({
    where: { id: 'test-group-1' },
    update: {},
    create: {
      id: 'test-group-1',
      name: 'Алтай 2024',
      lat: 51.9,
      lng: 85.9,
      address: 'Республика Алтай',
      ownerId: user1.id,
      members: {
        create: { userId: user1.id, role: 'OWNER' }
      }
    }
  })
}

main().then(() => prisma.$disconnect())
```

```json
// package.json в apps/backend:
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

```bash
npx prisma db seed
```
