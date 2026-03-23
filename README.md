# ✈️ Yasme Travel 2.0

> **Экспериментальный проект** — создан для изучения современного стека веб-разработки. Не предназначен для продакшн-использования.

Мобильное PWA-приложение для совместного хранения фотографий с путешествий. Друзья создают группы, привязанные к географической точке, загружают фото и просматривают поездки на карте.

---

## 🧪 Статус проекта

Этот репозиторий — **учебно-экспериментальный**. Здесь исследуются:

- архитектура монорепо на `pnpm workspaces` + `Turborepo`
- связка `Next.js 15 App Router` + `Fastify` в одном проекте
- presigned URL flow для загрузки файлов напрямую в S3-совместимое хранилище
- Yandex OAuth2 с JWT в httpOnly-куках
- mock-режим через **MSW (Mock Service Worker)** — приложение полностью работает без бэкенда
- PWA: установка на телефон, оффлайн-шелл, кэширование через Workbox


```

---

## 🛠 Стек технологий

| Слой | Технология |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS |
| UI компоненты | shadcn/ui + Framer Motion + Vaul (bottom sheets) |
| State | Zustand (UI) + TanStack Query v5 (server state) |
| Backend | Fastify 5 + TypeScript (ESM) |
| База данных | PostgreSQL 16 + Prisma ORM |
| Авторизация | Yandex ID OAuth2 → JWT (httpOnly cookies) |
| Хранилище фото | Yandex Object Storage (S3-compatible, presigned URLs) |
| Карты | Yandex Maps JavaScript API v3 |
| Mock | MSW (Mock Service Worker) v2 |
| Монорепо | pnpm workspaces + Turborepo |
| Деплой | Docker Compose + Nginx + Yandex Cloud VM |

---

## 🚀 Быстрый старт (демо-режим)

Самый быстрый способ запустить приложение **без какой-либо регистрации и внешних сервисов**:

```bash
# 1. Клонировать репозиторий
git clone <repo-url>
cd yasme-travel-2.0

# 2. Установить зависимости
pnpm install

# 3. Запустить только фронтенд (mock-режим уже включён)
pnpm --filter frontend dev
```

Открыть **http://localhost:3000** → нажать **"Войти в демо-режиме"**.

Все API-запросы перехватываются MSW — бэкенд, база данных и Yandex-аккаунты не нужны.

### Что работает в демо-режиме

- 4 готовые поездки (Алтай, Байкал, Сочи, Питер) с фотографиями
- Создание новых групп с локацией и участниками
- Загрузка фото (имитируется, появляются placeholder-изображения)
- Карта с маркерами всех поездок
- Список друзей и приглашение в группу
- Редактирование профиля (имя, аватар)
- Выход из аккаунта

---

## ⚙️ Полный запуск (с реальным бэкендом)

### Требования

- Node.js ≥ 20
- pnpm ≥ 9
- Docker + Docker Compose

### 1. Переменные окружения

```bash
cp .env.example .env
```

Заполнить пустые значения (подробнее — в разделе «Внешние сервисы»):

```bash
YANDEX_CLIENT_ID=        # oauth.yandex.ru
YANDEX_CLIENT_SECRET=    # oauth.yandex.ru
YOS_ACCESS_KEY_ID=       # Yandex Cloud → IAM
YOS_SECRET_ACCESS_KEY=   # Yandex Cloud → IAM
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=  # developer.tech.yandex.ru
```

Отключить mock-режим:

```bash
# apps/frontend/.env.local
NEXT_PUBLIC_MOCK_MODE=false
```

### 2. Запуск

```bash
# Поднять базу данных
docker compose up -d postgres

# Применить миграции
pnpm db:migrate

# Запустить фронтенд + бэкенд параллельно
pnpm dev
```

| Сервис | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api/v1 |
| Prisma Studio | http://localhost:5555 (после `pnpm db:studio`) |

---

## 📦 Структура монорепо

```
yasme-travel-2.0/
├── apps/
│   ├── frontend/          # Next.js PWA (порт 3000)
│   └── backend/           # Fastify REST API (порт 3001)
├── packages/
│   └── shared/            # Общие TypeScript типы (@yasme/shared)
├── docs/                  # Полная документация
├── docker-compose.yml     # PostgreSQL
├── .env.example           # Шаблон переменных окружения
└── turbo.json             # Turborepo конфигурация
```

---

## 🔑 Внешние сервисы (для полного режима)

Нужно зарегистрироваться в трёх местах:

### 1. Yandex OAuth — `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`
**https://oauth.yandex.ru/client/new**
- Платформа: Веб-сервисы
- Callback URI: `http://localhost:3001/api/v1/auth/callback`
- Доступы: `login:info`, `login:email`, `login:avatar`, `login:phone`

### 2. Yandex Cloud — `YOS_ACCESS_KEY_ID`, `YOS_SECRET_ACCESS_KEY`
**https://console.yandex.cloud**
- Создать бакет `yasme-travel-photos` с публичным доступом, регион `ru-central1`
- Создать сервисный аккаунт с ролью `storage.uploader`
- Создать статический ключ доступа → скопировать ID и секрет

### 3. Yandex Maps — `NEXT_PUBLIC_YANDEX_MAPS_API_KEY`
**https://developer.tech.yandex.ru**
- Подключить «JavaScript API и HTTP Геокодер»
- Указать домен: `localhost`

---

## 📋 Полезные команды

```bash
# Разработка
pnpm dev                        # запустить всё (turbo)
pnpm --filter frontend dev      # только фронтенд
pnpm --filter backend dev       # только бэкенд

# База данных
pnpm db:migrate                 # создать и применить миграцию
pnpm db:generate                # обновить Prisma Client
pnpm db:studio                  # открыть Prisma Studio

# Проверки
pnpm --filter frontend tsc --noEmit   # TypeScript фронтенд
pnpm --filter backend tsc --noEmit    # TypeScript бэкенд

# Сборка
pnpm build                      # собрать все пакеты

# Добавить shadcn/ui компонент
cd apps/frontend && npx shadcn@latest add dialog
```

---

## 📚 Документация

| Файл | Содержимое |
|---|---|
| `docs/user-flows.md` | Все пользовательские пути (UC-01..UC-10) |
| `docs/architecture.md` | Архитектура системы, диаграммы |
| `docs/api.md` | REST API reference |
| `docs/database.md` | Схема БД, Prisma schema |
| `docs/auth-flow.md` | Yandex OAuth2 пошагово |
| `docs/photo-upload.md` | Presigned URL flow |
| `docs/design-system.md` | Дизайн-система, цвета, компоненты |
| `docs/deployment.md` | Docker, Yandex Cloud, Nginx |
| `apps/frontend/CLAUDE.md` | Инструкции для AI-ассистента (фронтенд) |
| `apps/backend/CLAUDE.md` | Инструкции для AI-ассистента (бэкенд) |

---

## 📄 Лицензия

MIT — используй как хочешь, это всё равно эксперимент.
