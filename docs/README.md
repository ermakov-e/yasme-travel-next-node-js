# Yasme Travel 2.0

> Совместное хранение фотографий с путешествий. Создавай группы для поездок, загружай фото вместе с друзьями, смотри все маршруты на карте.

---

## Навигация приложения

```
┌─────────────────────────────────────────┐
│                                         │
│   [Группы]  [Карта]  [Друзья]  [Профиль]│  ← BottomNav
│                                         │
│  Группы:           Карта:               │
│  ┌───────────┐     ┌───────────────┐    │
│  │ 🏔 Алтай  │     │  [Яндекс.     │    │
│  │ 12 фото   │     │   Карты с     │    │
│  └───────────┘     │   маркерами]  │    │
│  ┌───────────┐     └───────────────┘    │
│  │ 🌊 Байкал │                          │
│  │  8 фото   │                          │
│  └───────────┘                          │
│                                         │
└─────────────────────────────────────────┘
```

---

## Требования

- **Node.js** v20 LTS или выше
- **pnpm** v10+ (`npm install -g pnpm`)
- **Docker** и **Docker Compose** v2+
- Аккаунт **Яндекса** (для OAuth)
- Ключи **Yandex Object Storage** (S3)
- API-ключ **Яндекс.Карт** JavaScript API v3

---

## Quick Start (5 шагов)

### 1. Клонирование и установка зависимостей

```bash
git clone <repo-url> yasme-travel-2.0
cd yasme-travel-2.0
pnpm install
```

### 2. Настройка переменных окружения

```bash
cp .env.example .env
# Заполни .env — минимум для локального запуска:
#   POSTGRES_PASSWORD=changeme
#   YANDEX_CLIENT_ID=...
#   YANDEX_CLIENT_SECRET=...
#   YANDEX_REDIRECT_URI=http://localhost:3001/api/v1/auth/callback
#   JWT_SECRET=$(openssl rand -hex 32)
```

### 3. Запуск PostgreSQL

```bash
docker compose up postgres -d
# Подождать ~5 секунд пока postgres инициализируется
```

### 4. Применить миграции БД

```bash
pnpm db:migrate
# Введи название миграции: init
```

### 5. Запустить приложение

```bash
pnpm dev
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
```

Открой `http://localhost:3000` — увидишь экран входа через Яндекс ID.

---

## MVP Scope

### Что включено в MVP
- Вход через Яндекс ID (OAuth2)
- Список групп-поездок с обложками
- Создание группы (3 шага: обложка + название → локация → друзья)
- Галерея фото внутри группы (masonry grid)
- Загрузка фото (presigned URL → Yandex Object Storage)
- Карта всех поездок с маркерами
- Список всех пользователей (для приглашения)
- Профиль (аватар + имя)
- PWA (устанавливается на телефон)

### Отложено на post-MVP
- Push-уведомления
- Комментарии и реакции на фото
- Приватность групп
- Система заявок в друзья
- Видео
- CDN, мониторинг

---

## Карта документации

| Документ | Описание |
|---|---|
| **[user-flows.md](./user-flows.md)** | ⭐ Все пользовательские сценарии (UC) |
| [architecture.md](./architecture.md) | Архитектура системы и стек |
| [api.md](./api.md) | REST API reference |
| [database.md](./database.md) | Схема БД и Prisma |
| [auth-flow.md](./auth-flow.md) | Yandex OAuth2 пошагово |
| [photo-upload.md](./photo-upload.md) | Загрузка фото через S3 |
| [design-system.md](./design-system.md) | Дизайн-токены, компоненты |
| [deployment.md](./deployment.md) | Деплой на Yandex Cloud |

---

## Структура монорепо

```
yasme-travel-2.0/
├── apps/
│   ├── frontend/          # Next.js PWA (порт 3000)
│   └── backend/           # Fastify API (порт 3001)
├── packages/
│   └── shared/            # Общие TypeScript типы
├── docs/                  # Документация (этот раздел)
├── CLAUDE.md              # Инструкции для Claude Code
├── docker-compose.yml
└── .env.example
```
