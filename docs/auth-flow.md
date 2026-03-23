# Auth Flow — Yandex OAuth2

---

## Sequence Diagram

```
Браузер                    Next.js (3000)              Fastify (3001)           Яндекс
   │                            │                            │                     │
   │  1. Открывает /login       │                            │                     │
   │───────────────────────────>│                            │                     │
   │                            │                            │                     │
   │  2. Клик "Войти через Яндекс"                           │                     │
   │  → href="/api/v1/auth/yandex"                           │                     │
   │────────────────────────────────────────────────────────>│                     │
   │                            │  3. Генерировать state     │                     │
   │                            │  (CSRF токен, сохранить    │                     │
   │                            │  в httpOnly cookie 10 мин) │                     │
   │                            │                            │                     │
   │  302 Location: oauth.yandex.ru/authorize                │                     │
   │  ?client_id=...&redirect_uri=...                        │                     │
   │  &response_type=code&state=<csrf>                       │                     │
   │  &scope=login:info+login:email+login:avatar+login:phone │                     │
   │<────────────────────────────────────────────────────────│                     │
   │                            │                            │                     │
   │  4. Браузер переходит на Яндекс                         │                     │
   │────────────────────────────────────────────────────────────────────────────> │
   │                            │                            │  Форма входа Яндекс │
   │                            │                            │  (если не залогинен)│
   │  5. Пользователь подтверждает доступ                    │                     │
   │                            │                            │                     │
   │  6. Яндекс редиректит на callback:                      │                     │
   │  GET /api/v1/auth/callback?code=XXX&state=YYY           │                     │
   │────────────────────────────────────────────────────────>│                     │
   │                            │  7. Проверить state cookie │                     │
   │                            │  (CSRF защита)             │                     │
   │                            │                            │                     │
   │                            │  8. POST oauth.yandex.ru/token                  │
   │                            │  { code, client_id, client_secret }             │
   │                            │<──────────────────────────────────────────────> │
   │                            │  { access_token, ... }      │                   │
   │                            │                            │                     │
   │                            │  9. GET login.yandex.ru/info                    │
   │                            │  Authorization: OAuth <access_token>            │
   │                            │<──────────────────────────────────────────────> │
   │                            │  { id, real_name, default_avatar_id, phone }   │
   │                            │                            │                     │
   │                            │  10. Upsert user в DB      │                     │
   │                            │  (by yandexId)             │                     │
   │                            │                            │                     │
   │                            │  11. Sign JWT              │                     │
   │                            │  { sub, yandexId, name, avatarUrl }             │
   │                            │  exp: 7d                   │                     │
   │                            │                            │                     │
   │  302 Location: /groups     │                            │                     │
   │  Set-Cookie: token=<jwt>   │                            │                     │
   │  httpOnly; Secure; SameSite=Lax                         │                     │
   │<────────────────────────────────────────────────────────│                     │
   │                            │                            │                     │
   │  12. Последующие запросы   │                            │                     │
   │  автоматически включают cookie                          │                     │
   │────────────────────────────────────────────────────────>│                     │
   │                            │  requireAuth плагин        │                     │
   │                            │  верифицирует JWT          │                     │
```

---

## Настройка Yandex OAuth приложения

1. Перейди на **https://oauth.yandex.ru/client/new**
2. Заполни:
   - **Название:** Yasme Travel
   - **Платформа:** Web-сервисы
   - **Callback URI:** `http://localhost:3001/api/v1/auth/callback` (dev)
   - **Callback URI:** `https://yourdomain.com/api/v1/auth/callback` (prod)
   - > ⚠️ Яндекс позволяет несколько URI — добавь оба сразу
3. **Доступы (scope):**
   - ✅ Яндекс ID (login:info) — имя, фото
   - ✅ Адрес почты (login:email)
   - ✅ Номер телефона (login:phone) — необязательно, пользователь может отказать
4. Скопируй `ClientID` и `ClientSecret` в `.env`:
   ```
   YANDEX_CLIENT_ID=ваш_client_id
   YANDEX_CLIENT_SECRET=ваш_client_secret
   ```

---

## JWT

### Payload
```json
{
  "sub": "user-uuid",
  "yandexId": "1234567890",
  "name": "Иван Петров",
  "avatarUrl": "https://avatars.yandex.net/get-yapic/...",
  "iat": 1700000000,
  "exp": 1700604800
}
```

### Настройки
- **Алгоритм:** HS256
- **Срок жизни:** 7 дней
- **Secret:** Минимум 256 бит (`openssl rand -hex 32`)
- **Хранение:** httpOnly cookie — недоступен JS, защита от XSS

### Нет Refresh Token (MVP)
По истечении 7 дней пользователь повторно авторизуется через Яндекс. Refresh-токен добавим в post-MVP.

---

## Cookie параметры

```
Set-Cookie: token=<jwt>
  httpOnly    ← не доступен document.cookie (XSS защита)
  Secure      ← только HTTPS (в prod)
  SameSite=Lax ← CSRF защита: cookie отправляется при переходах с других сайтов,
                 но не при AJAX запросах с других доменов
  Path=/
  Max-Age=604800 ← 7 дней
```

**Dev режим:** `Secure` не требуется на localhost. Fastify автоматически убирает `Secure` при `NODE_ENV=development`.

---

## CSRF Защита

1. При `GET /auth/yandex` генерируется случайный `state` (crypto.randomBytes)
2. `state` сохраняется в отдельном httpOnly cookie (`state`, TTL 10 минут)
3. При `GET /auth/callback` проверяем: `query.state === cookie.state`
4. Если не совпадают — отклонить запрос с 400
5. После проверки — удалить state cookie

---

## Session Restore (SSR)

Каждый защищённый маршрут обёрнут в `(app)/layout.tsx` — Server Component:

```typescript
// apps/frontend/src/app/(app)/layout.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) {
    redirect('/login')
  }

  // Запрос к бэкенду с пробросом cookie
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
    headers: { Cookie: `token=${token}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    redirect('/login')
  }

  const user = await res.json()
  // Передаём user в контекст через Zustand hydration
  return <AuthProvider user={user}>{children}</AuthProvider>
}
```

---

## Same-Origin Cookie Fix (Dev)

В dev режиме frontend (3000) и backend (3001) — разные origin. `SameSite=Lax` не позволяет отправлять cookie на другой origin.

**Решение:** Next.js rewrites проксируют `/api/*` через frontend:

```typescript
// apps/frontend/next.config.ts
export default {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ]
  },
}
```

Браузер видит один origin (`localhost:3000`), cookie отправляются корректно.

В **production** Nginx выполняет ту же роль:
```nginx
location /api/ {
  proxy_pass http://backend:3001/api/;
}
```
