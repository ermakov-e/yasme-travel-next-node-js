# Photo Upload — Загрузка фотографий

Используется паттерн **Presigned URL** — браузер загружает файлы напрямую в Yandex Object Storage, минуя бэкенд. Это снимает нагрузку с API-сервера.

---

## Sequence Diagram

```
Браузер (клиент)              Fastify Backend           Yandex Object Storage
       │                            │                            │
       │  1. POST /photos/presign   │                            │
       │  { filename, contentType,  │                            │
       │    fileSize }              │                            │
       │───────────────────────────>│                            │
       │                            │  Валидация:                │
       │                            │  ✓ пользователь в группе  │
       │                            │  ✓ contentType допустим   │
       │                            │  ✓ fileSize ≤ 10MB        │
       │                            │                            │
       │                            │  Генерирует storageKey:    │
       │                            │  groups/{groupId}/         │
       │                            │  photos/{uuid}.jpg         │
       │                            │                            │
       │                            │  S3.getSignedUrl(PUT)      │
       │                            │  TTL: 5 минут              │
       │                            │───────────────────────────>│
       │                            │<─── presignedUrl ──────────│
       │                            │                            │
       │  { presignedUrl,           │                            │
       │    storageKey }            │                            │
       │<───────────────────────────│                            │
       │                            │                            │
       │  2. PUT {presignedUrl}     │                            │
       │  Body: raw file bytes      │                            │
       │  Content-Type: image/jpeg  │                            │
       │────────────────────────────────────────────────────────>│
       │<─────────────── 200 OK ─────────────────────────────────│
       │  (прямой запрос, бэкенд    │                            │
       │   не участвует)            │                            │
       │                            │                            │
       │  3. POST /photos/confirm   │                            │
       │  { storageKey, caption? }  │                            │
       │───────────────────────────>│                            │
       │                            │  S3.headObject(storageKey) │
       │                            │  (проверяем, что загружен) │
       │                            │───────────────────────────>│
       │                            │<─── { ContentType, Size } ─│
       │                            │                            │
       │                            │  INSERT INTO photos        │
       │                            │  { storageKey, groupId,    │
       │                            │    uploaderId, caption }    │
       │                            │                            │
       │  { photo }                 │                            │
       │<───────────────────────────│                            │
```

---

## Cover Photo (Обложка группы)

Обложка группы создаётся до создания самой группы (шаг 1 из 3 в модале):

```
Шаг 1 модала:
  Пользователь выбирает фото обложки
  → POST /groups/:groupId/photos/presign (используем temp endpoint)
    НО: storageKey = "temp/{uuid}/cover.{ext}"  ← временный путь
  → PUT (загрузка в S3)
  → Сохраняем storageKey локально в state модала (не confirm!)

При создании группы:
  → POST /groups { name, coverKey: "temp/.../cover.jpg", lat, lng, ... }

Бэкенд при создании группы:
  1. Создаёт запись Group в БД
  2. S3.copyObject: "temp/.../cover.jpg" → "groups/{newGroupId}/cover.jpg"
  3. S3.deleteObject: "temp/.../cover.jpg"
  4. Обновляет group.coverKey = "groups/{newGroupId}/cover.jpg"
```

**Почему так:** Мы не знаем `groupId` до создания группы, поэтому используем temp путь.

---

## S3 Object Key Convention (Naming)

```
groups/{groupId}/photos/{photoId}.{ext}   ← фото в группе
groups/{groupId}/cover.{ext}              ← обложка группы
avatars/{userId}/{uuid}.{ext}             ← аватар пользователя
temp/{uuid}/cover.{ext}                   ← временная обложка (до создания группы)
```

---

## S3 Lifecycle Rules

В Yandex Object Storage настрой lifecycle rule:

```xml
<LifecycleConfiguration>
  <Rule>
    <ID>delete-temp-uploads</ID>
    <Filter>
      <Prefix>temp/</Prefix>
    </Filter>
    <Status>Enabled</Status>
    <Expiration>
      <Days>7</Days>
    </Expiration>
  </Rule>
</LifecycleConfiguration>
```

Это автоматически удалит orphaned temp объекты (если сессия была прервана).

---

## Валидации

### На шаге presign (сервер):

| Проверка | Ошибка |
|---|---|
| Пользователь является членом группы | `403 FORBIDDEN` |
| `contentType` ∈ `image/jpeg`, `image/png`, `image/webp` | `400 VALIDATION_ERROR` |
| `fileSize` ≤ 10485760 (10 MB) | `400 VALIDATION_ERROR` |

### На шаге confirm (сервер):

| Проверка | Ошибка |
|---|---|
| `storageKey` начинается с `groups/{groupId}/` | `400 VALIDATION_ERROR` |
| `S3.headObject(storageKey)` успешен | `400 UPLOAD_NOT_FOUND` |

### На клиенте (до presign):

```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

if (!ALLOWED_TYPES.includes(file.type)) {
  toast.error('Поддерживаются JPEG, PNG, WebP')
  return
}
if (file.size > MAX_SIZE) {
  toast.error('Файл слишком большой, максимум 10 МБ')
  return
}
```

---

## Множественная загрузка

При выборе нескольких фото — параллельная загрузка с ограничением concurrency:

```typescript
// Не более 3 параллельных загрузок (чтобы не перегружать S3)
const CONCURRENCY = 3

async function uploadFiles(files: File[], groupId: string) {
  const chunks = chunk(files, CONCURRENCY)
  for (const batch of chunks) {
    await Promise.all(batch.map(file => uploadSingleFile(file, groupId)))
  }
}
```

---

## Отображение прогресса

```typescript
// Используем XHR для трекинга прогресса (fetch не поддерживает upload progress)
function uploadWithProgress(presignedUrl: string, file: File, onProgress: (pct: number) => void) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => e.status === 200 ? resolve(xhr) : reject(xhr)
    xhr.onerror = () => reject(xhr)
    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}
```

---

## Публичные URL

Бакет настроен на **public-read** для объектов под путём `groups/` и `avatars/`:

```
URL фото: https://{BUCKET_NAME}.storage.yandexcloud.net/{storageKey}
```

На клиенте строим URL:
```typescript
const photoUrl = `${process.env.NEXT_PUBLIC_YOS_PUBLIC_BASE_URL}/${photo.storageKey}`
```

---

## CORS настройка бакета

Необходимо для прямых PUT-запросов с браузера:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```
