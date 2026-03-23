# Database — Схема базы данных

---

## ER-диаграмма

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│    users    │         │  group_members   │         │   groups    │
│─────────────│         │──────────────────│         │─────────────│
│ id (PK)     │◄────────│ userId (FK)      │────────►│ id (PK)     │
│ yandexId    │         │ groupId (FK)     │         │ name        │
│ name        │         │ role             │         │ coverKey    │
│ avatarUrl   │         │ joinedAt         │         │ lat         │
│ phone       │         └──────────────────┘         │ lng         │
│ createdAt   │                                       │ address     │
│ updatedAt   │◄──────────────────────────────────────│ ownerId (FK)│
└──────┬──────┘                                       │ createdAt   │
       │                                              │ updatedAt   │
       │  uploadedBy                                  └──────┬──────┘
       │                                                     │
       ▼                                                     │ groupId
┌─────────────┐                                              │
│   photos    │◄─────────────────────────────────────────────┘
│─────────────│
│ id (PK)     │
│ groupId (FK)│
│ uploaderId  │
│ storageKey  │
│ caption     │
│ takenAt     │
│ createdAt   │
└─────────────┘
```

---

## Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String   @id @default(uuid())
  yandexId    String   @unique
  name        String
  avatarUrl   String?
  phone       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  ownedGroups Group[]       @relation("GroupOwner")
  memberships GroupMember[]
  photos      Photo[]

  @@map("users")
}

model Group {
  id        String   @id @default(uuid())
  name      String
  coverKey  String?
  lat       Float
  lng       Float
  address   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  ownerId String
  owner   User   @relation("GroupOwner", fields: [ownerId], references: [id])

  members GroupMember[]
  photos  Photo[]

  @@map("groups")
}

model GroupMember {
  id       String     @id @default(uuid())
  groupId  String
  userId   String
  role     MemberRole @default(MEMBER)
  joinedAt DateTime   @default(now())

  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id])

  @@unique([groupId, userId])
  @@map("group_members")
}

enum MemberRole {
  OWNER
  MEMBER
}

model Photo {
  id         String    @id @default(uuid())
  groupId    String
  uploaderId String
  storageKey String
  caption    String?
  takenAt    DateTime?
  createdAt  DateTime  @default(now())

  group    Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  uploader User  @relation(fields: [uploaderId], references: [id])

  @@map("photos")
}
```

---

## Описание таблиц

### `users`

| Поле | Тип | Описание |
|---|---|---|
| `id` | UUID | Primary key, генерируется автоматически |
| `yandexId` | String UNIQUE | ID пользователя в системе Яндекса — главный идентификатор для upsert |
| `name` | String | Отображаемое имя (из Яндекса, редактируемое) |
| `avatarUrl` | String? | Полный URL аватара. **Исключение:** аватар хранится как URL, т.к. Яндекс тоже даёт URL |
| `phone` | String? | Телефон из Яндекса, только если пользователь выдал scope `login:phone` |
| `createdAt` | DateTime | Первая авторизация |
| `updatedAt` | DateTime | Автообновление при изменениях |

### `groups`

| Поле | Тип | Описание |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | String | Название поездки |
| `coverKey` | String? | **S3-ключ** обложки (не URL!). Nullable — группа может быть без обложки |
| `lat` / `lng` | Float | Географические координаты (WGS84) |
| `address` | String? | Человекочитаемый адрес (из геокодера или ввода пользователя) |
| `ownerId` | UUID FK | Создатель группы, имеет права OWNER |

**Почему `coverKey` а не `coverUrl`:**
`storageKey` хранит только ключ объекта в бакете (`groups/abc/cover.jpg`), а не полный URL.
Это позволяет:
- Менять домен/бакет без миграции БД
- Строить URL динамически: `${BUCKET_BASE_URL}/${storageKey}`
- Легко удалять объекты из S3 по ключу

### `group_members`

| Поле | Тип | Описание |
|---|---|---|
| `groupId` + `userId` | UNIQUE | Составной уникальный индекс — один пользователь в группе один раз |
| `role` | Enum | `OWNER` или `MEMBER`. OWNER создаётся при создании группы |
| `joinedAt` | DateTime | Когда присоединился |

### `photos`

| Поле | Тип | Описание |
|---|---|---|
| `storageKey` | String | S3-ключ фото: `groups/{groupId}/photos/{photoId}.ext` |
| `caption` | String? | Подпись к фото (необязательно) |
| `takenAt` | DateTime? | Когда сделано фото (из EXIF или пользователя). Для сортировки по времени съёмки |

---

## Cascade Delete

| Удаление | Что каскадно удаляется |
|---|---|
| `DELETE groups` | Все `group_members`, все `photos` |
| `DELETE users` | **Не каскадное** — нужна ручная логика (или добавить в post-MVP) |

> **MVP**: удаление пользователей не предусмотрено. Добавить `onDelete: Cascade` на связи User → GroupMember и User → Photo в post-MVP.

---

## Индексы

Автоматически создаются Prisma:
- `users.yandexId` — UNIQUE INDEX (логин по Yandex ID)
- `group_members.(groupId, userId)` — UNIQUE INDEX (дублирование членства)
- Все FK-поля — INDEX (join-производительность)

Дополнительно рекомендуется добавить (post-MVP):
```sql
-- Быстрая выборка фото по группе, отсортированных по дате
CREATE INDEX photos_groupId_createdAt ON photos(group_id, created_at DESC);
```

---

## Миграции

```bash
# Создать и применить миграцию
cd apps/backend
pnpm db:migrate      # → npx prisma migrate dev

# Только обновить Prisma Client (без миграции)
pnpm db:generate     # → npx prisma generate

# Применить миграции на prod (без dev артефактов)
npx prisma migrate deploy

# Открыть визуальный редактор
pnpm db:studio       # → npx prisma studio
```
