# Services — Сервисный слой

Правило: **вся бизнес-логика в services**, роуты — только валидация + вызов сервиса + форматирование ответа.

---

## `storage.service.ts` — Yandex Object Storage

Yandex Object Storage совместим с S3 API. Используем `@aws-sdk/client-s3`.

### Ключевая особенность: endpoint

```typescript
import { S3Client, PutObjectCommand, HeadObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../config/env.js'

// ⚠️ Обязательно указывать endpoint для Yandex Object Storage:
export const s3Client = new S3Client({
  endpoint: env.YOS_ENDPOINT,          // https://storage.yandexcloud.net
  region: env.YOS_REGION,              // ru-central1
  credentials: {
    accessKeyId: env.YOS_ACCESS_KEY_ID,
    secretAccessKey: env.YOS_SECRET_ACCESS_KEY,
  },
  // Yandex не поддерживает path-style deprecated — используем virtual-hosted-style:
  forcePathStyle: false,
})
```

---

### `generatePresignedPutUrl`

```typescript
export async function generatePresignedPutUrl(
  storageKey: string,
  contentType: string,
  expiresInSeconds = 300  // 5 минут
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.YOS_BUCKET_NAME,
    Key: storageKey,
    ContentType: contentType,
  })

  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds })
}
```

---

### `verifyObjectExists`

```typescript
export async function verifyObjectExists(storageKey: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: env.YOS_BUCKET_NAME,
      Key: storageKey,
    }))
    return true
  } catch (error) {
    if ((error as any).name === 'NotFound') return false
    throw error
  }
}
```

---

### `moveTempCover` — перемещение обложки

```typescript
export async function moveTempCover(
  tempKey: string,          // temp/{uuid}/cover.jpg
  groupId: string,          // финальный groupId
  extension: string
): Promise<string> {
  const finalKey = `groups/${groupId}/cover.${extension}`

  // Копируем
  await s3Client.send(new CopyObjectCommand({
    Bucket: env.YOS_BUCKET_NAME,
    CopySource: `${env.YOS_BUCKET_NAME}/${tempKey}`,
    Key: finalKey,
  }))

  // Удаляем исходник
  await s3Client.send(new DeleteObjectCommand({
    Bucket: env.YOS_BUCKET_NAME,
    Key: tempKey,
  }))

  return finalKey
}
```

---

### `deleteObject`

```typescript
export async function deleteObject(storageKey: string): Promise<void> {
  await s3Client.send(new DeleteObjectCommand({
    Bucket: env.YOS_BUCKET_NAME,
    Key: storageKey,
  }))
}
```

---

### Построение публичного URL

```typescript
export function getPublicUrl(storageKey: string): string {
  return `${env.YOS_ENDPOINT}/${env.YOS_BUCKET_NAME}/${storageKey}`
}
// Пример: https://storage.yandexcloud.net/yasme-travel-photos/groups/uuid/photos/uuid.jpg
```

---

## `auth.service.ts` — Yandex OAuth + JWT

### Обмен кода на токен

```typescript
export async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch('https://oauth.yandex.ru/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: env.YANDEX_CLIENT_ID,
      client_secret: env.YANDEX_CLIENT_SECRET,
    }),
  })

  if (!response.ok) throw new Error('Failed to exchange code')

  const data = await response.json()
  return data.access_token as string
}
```

---

### Получение профиля из Яндекса

```typescript
interface YandexProfile {
  id: string
  real_name: string
  default_avatar_id: string
  default_phone?: { number: string }
  login: string
}

export async function getYandexProfile(accessToken: string): Promise<YandexProfile> {
  const response = await fetch('https://login.yandex.ru/info?format=json', {
    headers: { Authorization: `OAuth ${accessToken}` },
  })

  if (!response.ok) throw new Error('Failed to get Yandex profile')
  return response.json()
}
```

---

### JWT — подпись и верификация

```typescript
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export interface JwtPayload {
  sub: string        // user.id
  yandexId: string
  name: string
  avatarUrl: string | null
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,  // '7d'
    algorithm: 'HS256',
  })
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload
}
```

---

## `group.service.ts` — Бизнес-логика групп

```typescript
import type { PrismaClient } from '@prisma/client'
import { moveTempCover, getPublicUrl } from './storage.service.js'

export async function createGroup(
  prisma: PrismaClient,
  userId: string,
  data: CreateGroupDto
) {
  // 1. Создаём группу в транзакции
  const group = await prisma.$transaction(async (tx) => {
    const newGroup = await tx.group.create({
      data: {
        name: data.name,
        lat: data.lat,
        lng: data.lng,
        address: data.address,
        coverKey: null,
        ownerId: userId,
      }
    })

    // 2. Добавляем владельца
    await tx.groupMember.create({
      data: { groupId: newGroup.id, userId, role: 'OWNER' }
    })

    // 3. Добавляем участников
    if (data.memberIds?.length) {
      await tx.groupMember.createMany({
        data: data.memberIds
          .filter(id => id !== userId)  // исключаем владельца (уже добавлен)
          .map(memberId => ({ groupId: newGroup.id, userId: memberId, role: 'MEMBER' as const })),
        skipDuplicates: true,
      })
    }

    return newGroup
  })

  // 4. Перемещаем temp обложку → groups/{id}/cover.ext
  let coverKey: string | null = null
  if (data.coverKey?.startsWith('temp/')) {
    const ext = data.coverKey.split('.').pop() ?? 'jpg'
    coverKey = await moveTempCover(data.coverKey, group.id, ext)

    await prisma.group.update({
      where: { id: group.id },
      data: { coverKey },
    })
  }

  return formatGroup({ ...group, coverKey }, 1, 0)
}

// Форматирование: добавляем coverUrl из coverKey
function formatGroup(group: any, memberCount: number, photoCount: number) {
  return {
    ...group,
    coverUrl: group.coverKey ? getPublicUrl(group.coverKey) : null,
    memberCount,
    photoCount,
  }
}
```

---

## Добавить новый сервис

1. Создай `src/services/my-feature.service.ts`
2. Функции — чистые, принимают `prisma` (или `s3`) как параметр
3. Не используй fastify instance внутри сервисов (слабая связанность)
4. Импортируй в роутах: `import { myService } from '../../services/my-feature.service.js'`

```typescript
// Шаблон:
import type { PrismaClient } from '@prisma/client'

export async function doSomething(
  prisma: PrismaClient,
  userId: string,
  data: MyDto
): Promise<MyResult> {
  // бизнес-логика
}
```
