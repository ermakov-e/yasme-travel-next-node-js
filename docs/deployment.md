# Deployment — Деплой

---

## Локальная разработка

### Предварительные условия
- Docker Desktop запущен
- `.env` заполнен (см. `.env.example`)

### Запуск

```bash
# 1. Поднять PostgreSQL
docker compose up postgres -d

# 2. Применить миграции
pnpm db:migrate

# 3. Запустить backend + frontend
pnpm dev
# Backend: http://localhost:3001
# Frontend: http://localhost:3000
```

### Полный Docker Compose (dev)

```bash
# Поднять всё: postgres + backend + frontend
docker compose up

# Пересобрать контейнер после изменения зависимостей
docker compose up --build
```

---

## Docker Compose конфигурация

### `docker-compose.yml` (база, только postgres)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: yasme_travel
      POSTGRES_USER: yasme
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U yasme -d yasme_travel"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### `docker-compose.override.yml` (dev, backend + frontend с hot reload)

```yaml
services:
  backend:
    build:
      context: ./apps/backend
      target: development
    volumes:
      - ./apps/backend/src:/app/src     # Hot reload
      - ./packages/shared:/packages/shared
    ports:
      - "3001:3001"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ./apps/frontend
      target: development
    volumes:
      - ./apps/frontend/src:/app/src
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - backend
```

---

## Production — Yandex Cloud VM

### 1. Создание VM

1. Yandex Cloud Console → Compute Cloud → Создать ВМ
2. Параметры для MVP:
   - **ОС:** Ubuntu 22.04 LTS
   - **CPU:** 2 cores (2 vCPU)
   - **RAM:** 4 GB
   - **Диск:** 30 GB SSD
3. Добавь SSH-ключ
4. Назначь статический IP

### 2. Начальная настройка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Установка Docker Compose v2
sudo apt install docker-compose-plugin -y

# Установка Nginx
sudo apt install nginx -y

# Установка Certbot (SSL)
sudo apt install certbot python3-certbot-nginx -y
```

### 3. Деплой приложения

```bash
# Клонирование репозитория
git clone <repo-url> /var/www/yasme-travel
cd /var/www/yasme-travel

# Настройка env
cp .env.example .env.prod
nano .env.prod  # заполнить все значения

# Сборка и запуск
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  --env-file .env.prod up -d --build
```

### `docker-compose.prod.yml`

```yaml
services:
  backend:
    build:
      context: ./apps/backend
      target: production
    restart: unless-stopped
    env_file: .env.prod
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ./apps/frontend
      target: production
    restart: unless-stopped
    env_file: .env.prod
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
```

---

## Nginx конфигурация

```nginx
# /var/www/yasme-travel/nginx.conf

events { worker_connections 1024; }

http {
  upstream frontend { server frontend:3000; }
  upstream backend  { server backend:3001; }

  # HTTP → HTTPS redirect
  server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
  }

  server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # Gzip
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;

    # API → backend
    location /api/ {
      proxy_pass http://backend/api/;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Всё остальное → frontend
    location / {
      proxy_pass http://frontend;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
    }
  }
}
```

### SSL через Let's Encrypt

```bash
# Получить сертификат
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Автообновление (уже настроено в certbot, проверить):
sudo certbot renew --dry-run
```

---

## Yandex Object Storage

### Создание бакета

1. Yandex Cloud Console → Object Storage → Создать бакет
2. Имя: `yasme-travel-photos`
3. Доступ: **Публичный** (для GET запросов на фото)
4. Класс хранилища: Стандартный

### Настройка CORS

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://yourdomain.com"
    ],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type", "Content-Length", "X-Amz-Date", "Authorization"],
    "MaxAgeSeconds": 3600
  }
]
```

### Создание Service Account

1. IAM → Сервисные аккаунты → Создать
2. Имя: `yasme-storage-writer`
3. Роль: `storage.uploader` (только запись в конкретный бакет)
4. Создать статический ключ доступа → сохранить `Access Key ID` и `Secret Access Key`

### Lifecycle Policy

В консоли или через API:
- Prefix: `temp/`
- Expiration: 7 дней

---

## Переменные окружения — Production

```bash
# .env.prod

POSTGRES_PASSWORD=<надёжный пароль 32+ символов>

DATABASE_URL=postgresql://yasme:${POSTGRES_PASSWORD}@postgres:5432/yasme_travel

JWT_SECRET=<openssl rand -hex 32>
JWT_EXPIRES_IN=7d

YANDEX_CLIENT_ID=<из Yandex OAuth консоли>
YANDEX_CLIENT_SECRET=<из Yandex OAuth консоли>
YANDEX_REDIRECT_URI=https://yourdomain.com/api/v1/auth/callback

YOS_ACCESS_KEY_ID=<из Yandex Cloud IAM>
YOS_SECRET_ACCESS_KEY=<из Yandex Cloud IAM>
YOS_BUCKET_NAME=yasme-travel-photos
YOS_REGION=ru-central1
YOS_ENDPOINT=https://storage.yandexcloud.net

CORS_ORIGIN=https://yourdomain.com
PORT=3001
NODE_ENV=production

NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=<из developer.tech.yandex.ru>
NEXT_PUBLIC_YOS_PUBLIC_BASE_URL=https://yasme-travel-photos.storage.yandexcloud.net
```

---

## Checklist перед релизом

- [ ] Все env vars заполнены в `.env.prod`
- [ ] SSL сертификат получен и обновляется
- [ ] CORS настроен в Yandex Object Storage
- [ ] Lifecycle policy настроена для `temp/`
- [ ] Yandex OAuth: production redirect URI добавлен
- [ ] Яндекс.Карты: ключ привязан к домену (developer.tech.yandex.ru)
- [ ] `docker compose up -d` запускается без ошибок
- [ ] `pnpm db:migrate` выполнен
- [ ] `GET /api/v1/auth/me` → 401 (сервис отвечает)
- [ ] Lighthouse PWA audit ≥ 90 на мобильном
- [ ] Вход через Яндекс работает на prod URL
