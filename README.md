# StudioCRM

CRM-система для веб-студии: клиенты, проекты, задачи с трекингом времени, сотрудники, финансы, AI-помощник на Claude API.

Архитектура заложена под мультитенантность (SaaS): все бизнес-таблицы содержат `organizationId`, вся логика фильтрует данные по организации.

## Стек

- Next.js 15 (App Router) + TypeScript
- PostgreSQL + Prisma ORM
- Tailwind CSS 4 + shadcn/ui
- NextAuth.js v5 (email + пароль)
- TanStack Query, Zod
- Claude API (`claude-sonnet-5`) — AI-помощник

## Запуск

### 1. Установка зависимостей

```bash
npm install
```

### 2. Переменные окружения

```bash
cp .env.example .env
# заполните AUTH_SECRET (openssl rand -base64 32)
# ANTHROPIC_API_KEY нужен только для AI-помощника (фаза 5)
```

### 3. База данных

**Вариант А — Docker (рекомендуется):**

```bash
docker compose up -d
```

**Вариант Б — без Docker (embedded PostgreSQL):**

```bash
npm run db:local
# сервер работает, пока открыт терминал; данные — в .pgdata/
```

### 4. Миграции и демо-данные

```bash
npx prisma migrate dev   # применить миграции
npm run db:seed          # демо-данные
```

### 5. Запуск приложения

```bash
npm run dev
# http://localhost:3000
```

## Демо-доступы (пароль везде `password123`)

| Роль      | Email             |
| --------- | ----------------- |
| Владелец  | owner@studio.ru   |
| Менеджер  | manager@studio.ru |
| Сотрудник | dev1@studio.ru    |
| Сотрудник | dev2@studio.ru    |
| Сотрудник | design@studio.ru  |

## Роли

- **Владелец** — полный доступ, включая финансы и настройки
- **Менеджер** — клиенты, проекты, задачи; финансы только просмотр
- **Сотрудник** — свои задачи и проекты
- **Клиент** — портал согласования (фаза 6)

## Структура

```
prisma/            схема БД, миграции, сиды
scripts/db-local.mjs   embedded PostgreSQL без Docker
src/
  app/             страницы (App Router)
    (app)/         защищённая зона с навигацией
    login/         вход
    portal/        клиентский портал (фаза 6)
    actions/       server actions
    api/           route handlers
  components/
    ui/            shadcn/ui
    layout/        навигация, шапка, темы
  lib/
    auth.ts        NextAuth (роль и organizationId в сессии)
    rbac.ts        права доступа, requireSession/requireRole
    prisma.ts      клиент Prisma
```

## Полезные команды

```bash
npm run db:studio    # Prisma Studio — просмотр БД
npm run db:migrate   # новая миграция
npm run db:seed      # пересоздать демо-данные
npm run lint
npm run build
```

## Деньги

Все суммы хранятся в **минорных единицах** (копейках) как `Int`. В интерфейсе — деление на 100. Валюта организации настраивается (`RUB` по умолчанию; USD, UZS, KZT и др.).
