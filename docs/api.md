# API Reference

**Base URL:** `http://localhost:3001/api/v1` (dev) / `https://yourdomain.com/api/v1` (prod)

**Auth:** JWT в httpOnly cookie `token`. Cookie ставится автоматически браузером при каждом запросе.

---

## Общие форматы

### Пагинация

```
GET /endpoint?page=1&limit=20
```

```json
{
  "data": [...],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

### Ошибки

```json
{
  "error": "NOT_FOUND",
  "message": "Group not found",
  "statusCode": 404
}
```

| Код ошибки | HTTP | Когда |
|---|---|---|
| `UNAUTHORIZED` | 401 | Нет/неверный JWT cookie |
| `FORBIDDEN` | 403 | Нет прав (не владелец группы) |
| `NOT_FOUND` | 404 | Ресурс не найден |
| `VALIDATION_ERROR` | 400 | Неверные данные запроса |
| `CONFLICT` | 409 | Ресурс уже существует (напр. пользователь уже в группе) |
| `INTERNAL_ERROR` | 500 | Серверная ошибка |

---

## Auth — `/auth`

### `GET /auth/yandex`
Редирект на Yandex OAuth authorization URL. Используется как `href` кнопки входа.

**Auth:** Нет
**Response:** `302 Location: https://oauth.yandex.ru/authorize?...`

---

### `GET /auth/callback`
OAuth callback. Вызывается Яндексом после подтверждения пользователя.

**Auth:** Нет
**Query:** `?code=XXX&state=YYY`
**Response:** `302 Location: /groups` + `Set-Cookie: token=<jwt>; httpOnly; Secure; SameSite=Lax`

---

### `POST /auth/logout`
Выход из аккаунта.

**Auth:** Да
**Response:** `200 { message: "Logged out" }` + `Set-Cookie: token=; Max-Age=0`

---

### `GET /auth/me`
Получить текущего пользователя по JWT cookie. Используется для session restore.

**Auth:** Да
**Response `200`:**
```json
{
  "id": "uuid",
  "yandexId": "123456789",
  "name": "Иван Петров",
  "avatarUrl": "https://avatars.yandex.net/...",
  "phone": "+79001234567",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Users — `/users`

### `GET /users/me`
Полный профиль текущего пользователя.

**Auth:** Да
**Response `200`:** Объект `User` (аналогично `/auth/me`)

---

### `PATCH /users/me`
Обновить профиль.

**Auth:** Да
**Body:**
```json
{
  "name": "Новое имя",
  "avatarKey": "avatars/uuid/photo.jpg"
}
```
**Response `200`:** Обновлённый объект `User`

---

## Storage — `/storage`

### `POST /storage/avatar-presign`
Получить presigned URL для загрузки аватара.

**Auth:** Да
**Body:**
```json
{
  "filename": "avatar.jpg",
  "contentType": "image/jpeg",
  "fileSize": 204800
}
```
**Response `200`:**
```json
{
  "presignedUrl": "https://storage.yandexcloud.net/...",
  "storageKey": "avatars/uuid/avatar.jpg"
}
```

---

## Groups — `/groups`

### `GET /groups`
Список всех групп, в которых состоит текущий пользователь.

**Auth:** Да
**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Алтай 2024",
      "coverUrl": "https://storage.yandexcloud.net/groups/uuid/cover.jpg",
      "lat": 51.9,
      "lng": 85.9,
      "address": "Республика Алтай",
      "ownerId": "uuid",
      "memberCount": 4,
      "photoCount": 23,
      "createdAt": "2024-08-01T00:00:00.000Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

---

### `POST /groups`
Создать новую группу.

**Auth:** Да
**Body:**
```json
{
  "name": "Байкал, лето 2024",
  "coverKey": "temp/uuid/cover.jpg",
  "lat": 53.5,
  "lng": 108.2,
  "address": "Иркутская область",
  "memberIds": ["uuid1", "uuid2"]
}
```
**Response `201`:** Созданный объект `Group` (coverKey переименован в `groups/{id}/cover.jpg`)

---

### `GET /groups/:id`
Детали группы с участниками.

**Auth:** Да (только члены группы)
**Response `200`:**
```json
{
  "id": "uuid",
  "name": "Алтай 2024",
  "coverUrl": "...",
  "lat": 51.9,
  "lng": 85.9,
  "address": "Республика Алтай",
  "ownerId": "uuid",
  "members": [
    {
      "id": "uuid",
      "userId": "uuid",
      "role": "OWNER",
      "joinedAt": "...",
      "user": { "id": "uuid", "name": "Иван", "avatarUrl": "..." }
    }
  ],
  "photoCount": 23,
  "createdAt": "..."
}
```

---

### `PATCH /groups/:id`
Обновить группу (только владелец).

**Auth:** Да (только OWNER)
**Body:** `{ name?, coverKey?, lat?, lng?, address? }`
**Response `200`:** Обновлённый объект `Group`

---

### `DELETE /groups/:id`
Удалить группу (только владелец). Каскадно удаляет фото и членство.

**Auth:** Да (только OWNER)
**Response `204`:** No content

---

### `GET /groups/:id/members`
Список участников группы.

**Auth:** Да (члены группы)
**Response `200`:** `{ data: GroupMember[] }`

---

### `POST /groups/:id/members`
Добавить участников.

**Auth:** Да (только OWNER)
**Body:** `{ userIds: ["uuid1", "uuid2"] }`
**Response `200`:** `{ added: 2, skipped: 0 }` (skipped = уже в группе)

---

### `DELETE /groups/:id/members/:userId`
Удалить участника. Владелец может удалить любого, участник — только себя.

**Auth:** Да
**Response `204`:** No content

---

## Photos — `/groups/:groupId/photos`

### `GET /groups/:groupId/photos`
Список фотографий группы (пагинация).

**Auth:** Да (члены группы)
**Query:** `?page=1&limit=20`
**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "storageKey": "groups/uuid/photos/uuid.jpg",
      "url": "https://storage.yandexcloud.net/...",
      "caption": "Закат на Телецком",
      "takenAt": "2024-08-15T18:30:00.000Z",
      "createdAt": "...",
      "uploader": { "id": "uuid", "name": "Иван", "avatarUrl": "..." }
    }
  ],
  "total": 23,
  "page": 1,
  "limit": 20
}
```

---

### `POST /groups/:groupId/photos/presign`
Получить presigned URL для загрузки фото.

**Auth:** Да (члены группы)
**Body:**
```json
{
  "filename": "IMG_4521.jpg",
  "contentType": "image/jpeg",
  "fileSize": 3145728
}
```
**Валидации:**
- `fileSize` ≤ 10MB (10485760 байт)
- `contentType` ∈ `["image/jpeg", "image/png", "image/webp"]`

**Response `200`:**
```json
{
  "presignedUrl": "https://storage.yandexcloud.net/...?X-Amz-Signature=...",
  "storageKey": "groups/uuid/photos/uuid.jpg"
}
```

---

### `POST /groups/:groupId/photos/confirm`
Подтвердить успешную загрузку, создать запись в БД.

**Auth:** Да (члены группы)
**Body:**
```json
{
  "storageKey": "groups/uuid/photos/uuid.jpg",
  "caption": "Закат на Телецком",
  "takenAt": "2024-08-15T18:30:00.000Z"
}
```
**Response `201`:** Созданный объект `Photo`

---

### `DELETE /groups/:groupId/photos/:photoId`
Удалить фото (загрузивший или владелец группы).

**Auth:** Да
**Response `204`:** No content + объект удаляется из S3

---

## Friends — `/friends`

### `GET /friends`
Список всех зарегистрированных пользователей (MVP: все, кроме себя).

**Auth:** Да
**Query:** `?page=1&limit=50`
**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Мария Иванова",
      "avatarUrl": "...",
      "phone": "+79009876543"
    }
  ],
  "total": 15
}
```
