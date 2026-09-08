# Expence Tracker

Общий журнал совместных расходов — монорепозиторий с SPA на React и API на Go.
Пользователи входят через Google, создают пространства (`spaces`), приглашают
участников и вносят расходы. Балансы между участниками считаются на лету.

## Стек

| Слой            | Выбор |
|-----------------|-------|
| Монорепо        | pnpm workspaces (`apps/*`) + корневой `Makefile`; бэкенд — отдельный Go-модуль |
| Фронтенд        | React 19 + Vite + TypeScript, React Router, TanStack Query, Tailwind v4 |
| Бэкенд          | Go 1.25 + Gin |
| БД              | PostgreSQL 17, без ORM — `pgx/v5` (`pgxpool`) |
| Доступ к SQL    | `sqlc` (кодогенерация из `.sql`, драйвер `pgx/v5`) |
| Миграции        | `goose` (SQL up/down в одном файле) |
| Аутентификация  | Google OAuth 2.0 + JWT access/refresh |
| Контракт API    | `api/openapi.yaml` — источник правды; типы фронтенда генерируются из него |

## Структура

```
api/openapi.yaml          контракт API (источник правды)
apps/web/                  SPA на React
backend/                   Go-модуль: cmd/{api,migrate}, internal/*, migrations/
backend/internal/db/       pgxpool + queries/*.sql; вывод sqlc в db/sqlc/ (в .gitignore)
Makefile                   оркестрация web + backend + БД
docker-compose.yaml        Postgres 17 (+ опционально Adminer)
```

## Требования

- Node 22+ и pnpm 9
- Go 1.25+
- Docker (для Postgres)

## Быстрый старт

```bash
cp .env.example .env
make db-up          # поднять Postgres
make deps           # зависимости web + Go, установка sqlc в backend/bin
make migrate-up     # применить миграции (через ./backend/cmd/migrate — без бинаря goose)
make gen            # sqlc generate + генерация TS-типов из openapi
make dev            # запустить API (:8080) и web (:5173) вместе
```

`make help` выводит все цели Makefile.

## Заметки для первого запуска

- **Путь Go-модуля** — заглушка (`github.com/reshnyakdg/expence-tracker/backend`).
  Смена: `cd backend && go mod edit -module <path>`, поправить импорты, затем `go mod tidy`.
- `apps/web/src/shared/api/schema.d.ts` генерируется из `api/openapi.yaml` командой
  `make openapi`; закоммичен, чтобы приложение проходило типизацию сразу после клона.
- Бизнес-логика реализована: `auth` (Google OAuth + refresh в БД), `spaces`,
  `members`, `categories`, `expenses`, `balances`. Слои: `httpapi/handlers` →
  `service` → `domain.Store` (интерфейсы) → `repository` (sqlc + pgx).

### Локальный вход без Google (`dev-login`)

При `APP_ENV=local` открывается ручка `POST /api/v1/auth/dev-login`
(`{ "email": "...", "name": "..." }` → пара токенов). На экране входа появляется
форма «Dev login». В `prod`-конфиге ручка не регистрируется.

### Реальный Google OAuth

1. Google Cloud Console → *OAuth consent screen* (тип External, добавить себя в
   Test users) → *Credentials* → *Create OAuth client ID* → тип **Web application**.
2. **Authorized redirect URI:** `http://localhost:5173/auth/callback`
   (совпадает с `GOOGLE_OAUTH_REDIRECT_URL`). Scopes: `openid email profile`.
3. Вписать `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` в `.env`, `make dev`.
4. Поток: SPA открывает `auth/google/login?redirect_uri=/spaces` → редирект на
   Google → Google возвращает браузер на `http://localhost:5173/auth/callback` →
   страница SPA дергает `GET /api/v1/auth/google/callback?code=…&state=…` → сервер
   валидирует подписанный `state`, обменивает `code` на профиль, заводит/находит
   пользователя и отдаёт пару токенов.

## Разработка

| Задача | Команда |
|--------|---------|
| Только API | `make run-api` |
| Только web | `make run-web` |
| Новая миграция | `make migrate-create name=add_x` |
| Перегенерация кода | `make gen` |
| Линт / тесты | `make lint` / `make test` |
| Сборка | `make build` |

---

# API

- **Базовый URL (dev):** `http://localhost:8080`
- **Версионирование:** все прикладные ручки под префиксом `/api/v1`.
- **Формат:** JSON (`Content-Type: application/json`), суммы — в минорных единицах
  (`amount_cents`, целое), даты трат — `YYYY-MM-DD`, метки времени — RFC 3339.
- **Аутентификация:** `Authorization: Bearer <access_token>` (JWT HS256, subject = UUID
  пользователя). Публичны только `GET /healthz` и ручки `auth/google/*` и `auth/refresh`.
- **Идентификатор запроса:** заголовок `X-Request-Id` принимается и возвращается
  (генерируется, если не передан).
- **Ошибки:** единый объект

  ```json
  { "code": "unauthorized", "message": "missing bearer token", "details": { } }
  ```

  Типовые статусы: `400` — невалидное тело/параметры, `401` — нет/протух токен
  или refresh отозван, `403` — недостаточно прав (напр. только owner может выдать
  роль owner), `404` — ресурс не найден или не виден не-участнику, `409` —
  конфликт (напр. категория с таким именем уже есть), `422` — тело валидно как
  JSON, но не проходит бизнес-правила.

## Сводка ручек

| Метод | Путь | Auth | Назначение |
|-------|------|:----:|------------|
| GET    | `/healthz`                                        | —  | Liveness-проба |
| GET    | `/api/v1/auth/google/login`                       | —  | Старт OAuth: редирект на экран согласия Google |
| GET    | `/api/v1/auth/google/callback`                    | —  | Callback OAuth: обмен `code` на пару токенов |
| POST   | `/api/v1/auth/dev-login`                          | —  | Только `APP_ENV=local`: пара токенов по email |
| POST   | `/api/v1/auth/refresh`                            | —  | Ротация пары токенов по refresh-токену |
| POST   | `/api/v1/auth/logout`                             | ✔  | Отзыв всех refresh-токенов пользователя |
| GET    | `/api/v1/me`                                      | ✔  | Текущий пользователь |
| GET    | `/api/v1/spaces`                                  | ✔  | Список пространств пользователя |
| POST   | `/api/v1/spaces`                                  | ✔  | Создать пространство |
| GET    | `/api/v1/spaces/{spaceId}`                        | ✔  | Получить пространство |
| GET    | `/api/v1/spaces/{spaceId}/members`                | ✔  | Список участников пространства |
| POST   | `/api/v1/spaces/{spaceId}/members`                | ✔  | Добавить участника по email |
| GET    | `/api/v1/spaces/{spaceId}/categories`             | ✔  | Список категорий пространства |
| POST   | `/api/v1/spaces/{spaceId}/categories`             | ✔  | Создать категорию |
| GET    | `/api/v1/spaces/{spaceId}/expenses`               | ✔  | Список расходов (фильтры + пагинация) |
| POST   | `/api/v1/spaces/{spaceId}/expenses`               | ✔  | Внести расход |
| GET    | `/api/v1/spaces/{spaceId}/expenses/{expenseId}`   | ✔  | Получить расход |
| PATCH  | `/api/v1/spaces/{spaceId}/expenses/{expenseId}`   | ✔  | Изменить расход |
| DELETE | `/api/v1/spaces/{spaceId}/expenses/{expenseId}`   | ✔  | Удалить расход (мягкое удаление) |
| GET    | `/api/v1/spaces/{spaceId}/balances`               | ✔  | Балансы по участникам пространства |

---

## Health

### `GET /healthz`

Проба живости. Без аутентификации.

**200** → `{ "status": "ok" }`

---

## Аутентификация

Поток: SPA открывает `auth/google/login` → 302 на экран согласия Google → Google
возвращает браузер на `http://localhost:5173/auth/callback?code=...&state=...`
(значение `GOOGLE_OAUTH_REDIRECT_URL`) → страница SPA вызывает
`GET /api/v1/auth/google/callback?code=...&state=...` → сервер валидирует
подписанный `state`, обменивает `code` на профиль Google, заводит/находит
пользователя и выдаёт **пару токенов**. Короткий `access_token` кладётся в
`Authorization`, `refresh_token` — обменивается на новую пару через `auth/refresh`
(старый токен при этом отзывается — ротация). Для локальной разработки без Google
есть `auth/dev-login` (см. корневой README).

**`TokenPair`**

| Поле | Тип | Описание |
|------|-----|----------|
| `access_token`  | string | JWT, срок жизни — `JWT_ACCESS_TTL` (по умолчанию 15m) |
| `refresh_token` | string | Долгоживущий токен, `JWT_REFRESH_TTL` (по умолчанию 720h) |
| `expires_in`    | integer | Время жизни `access_token` в секундах |

### `GET /api/v1/auth/google/login`

Начинает OAuth-поток. Без аутентификации.

| Query | Обяз. | Описание |
|-------|:-----:|----------|
| `redirect_uri` | нет | Куда вернуть браузер после успешного входа |

**302** → редирект на экран согласия Google (заголовок `Location`).

### `GET /api/v1/auth/google/callback`

Callback от Google. Без аутентификации.

| Query | Обяз. | Описание |
|-------|:-----:|----------|
| `code`  | да | Код авторизации Google |
| `state` | да | Anti-CSRF значение, выданное на шаге `login` |

**200** → `TokenPair` &nbsp;·&nbsp; **401** → `Error` (невалидный `code`/`state`)

### `POST /api/v1/auth/refresh`

Обмен refresh-токена на новую пару. Без аутентификации.

**Тело:** `{ "refresh_token": "<string>" }` (обязательно)

**200** → `TokenPair` &nbsp;·&nbsp; **401** → `Error` (токен невалиден/отозван)

### `POST /api/v1/auth/logout`

Отзывает текущий refresh-токен. Требует `Bearer`.

**204** → без тела

### `GET /api/v1/me`

Текущий аутентифицированный пользователь.

**200** → `User`

**`User`**

| Поле | Тип | Описание |
|------|-----|----------|
| `id`         | string (uuid) | |
| `email`      | string | |
| `name`       | string | |
| `avatar_url` | string \| null | URL аватара из Google |
| `created_at` | string (date-time) | |

---

## Пространства (`spaces`)

Пространство — общий журнал: у него есть валюта, владелец и участники. Все
вложенные ресурсы (участники, категории, расходы, балансы) адресуются через
`spaceId`. Доступ имеют только участники пространства (иначе `403`).

**`Space`**

| Поле | Тип | Описание |
|------|-----|----------|
| `id`         | string (uuid) | |
| `name`       | string | |
| `currency`   | string(3) | Код валюты ISO 4217, напр. `USD` |
| `owner_id`   | string (uuid) | Создатель пространства |
| `created_at` | string (date-time) | |

### `GET /api/v1/spaces`

Список пространств, в которых состоит текущий пользователь.

**200** → `Space[]`

### `POST /api/v1/spaces`

Создать пространство. Создатель автоматически становится участником с ролью `owner`.

**Тело — `SpaceInput`**

| Поле | Тип | Обяз. | Ограничения |
|------|-----|:-----:|-------------|
| `name`     | string | да  | 1–120 символов |
| `currency` | string | нет | ровно 3 символа, по умолчанию `USD` |

**201** → `Space`

### `GET /api/v1/spaces/{spaceId}`

Получить пространство по id.

**200** → `Space` &nbsp;·&nbsp; **404** → `Error`

### `GET /api/v1/spaces/{spaceId}/members`

Список участников с вложенным профилем пользователя.

**200** → `SpaceMember[]`

**`SpaceMember`**

| Поле | Тип | Описание |
|------|-----|----------|
| `space_id`  | string (uuid) | |
| `user_id`   | string (uuid) | |
| `role`      | `owner` \| `member` | |
| `joined_at` | string (date-time) | |
| `user`      | `User` | Профиль участника |

### `POST /api/v1/spaces/{spaceId}/members`

Добавить участника по email (пользователь должен быть уже зарегистрирован).

**Тело**

| Поле | Тип | Обяз. | Описание |
|------|-----|:-----:|----------|
| `email` | string (email) | да  | Email существующего пользователя |
| `role`  | `owner` \| `member` | нет | По умолчанию `member` |

**201** → `SpaceMember`

---

## Категории (`categories`)

Категории расходов, свои для каждого пространства. Пара `(space_id, name)` уникальна.

**`Category`**

| Поле | Тип | Описание |
|------|-----|----------|
| `id`         | string (uuid) | |
| `space_id`   | string (uuid) | |
| `name`       | string | |
| `color`      | string \| null | HEX-цвет, напр. `#4f46e5` |
| `icon`       | string \| null | Эмодзи или имя иконки |
| `created_at` | string (date-time) | |

### `GET /api/v1/spaces/{spaceId}/categories`

Список категорий пространства (сортировка по имени).

**200** → `Category[]`

### `POST /api/v1/spaces/{spaceId}/categories`

Создать категорию.

**Тело — `CategoryInput`**

| Поле | Тип | Обяз. | Ограничения |
|------|-----|:-----:|-------------|
| `name`  | string | да  | 1–60 символов |
| `color` | string | нет | HEX-формат `^#[0-9a-fA-F]{6}$` |
| `icon`  | string | нет | до 32 символов |

**201** → `Category`

---

## Расходы (`expenses`)

Запись о трате: кто заплатил (`payer_id`), сумма, валюта, категория, дата и
описание. Удаление мягкое (`deleted_at`), из выборок такие записи исключаются.

**`Expense`**

| Поле | Тип | Описание |
|------|-----|----------|
| `id`           | string (uuid) | |
| `space_id`     | string (uuid) | |
| `payer_id`     | string (uuid) | Кто оплатил |
| `category_id`  | string (uuid) \| null | |
| `amount_cents` | integer | Сумма в минорных единицах, `> 0` |
| `currency`     | string(3) | |
| `description`  | string \| null | |
| `spent_at`     | string (date) | Дата траты `YYYY-MM-DD` |
| `created_by`   | string (uuid) | Кто внёс запись |
| `created_at`   | string (date-time) | |
| `updated_at`   | string (date-time) | |

### `GET /api/v1/spaces/{spaceId}/expenses`

Список расходов пространства с фильтрами и курсорной пагинацией.

| Query | Тип | По умолчанию | Описание |
|-------|-----|--------------|----------|
| `from`   | date | — | Нижняя граница `spent_at` (включительно) |
| `to`     | date | — | Верхняя граница `spent_at` (включительно) |
| `limit`  | integer | 50 | 1–200 |
| `cursor` | string | — | Курсор следующей страницы из поля `next_cursor` |

**200** → `ExpenseList`

**`ExpenseList`**

| Поле | Тип | Описание |
|------|-----|----------|
| `items`       | `Expense[]` | |
| `next_cursor` | string \| null | `null`, если страниц больше нет |

### `POST /api/v1/spaces/{spaceId}/expenses`

Внести расход.

**Тело — `ExpenseInput`**

| Поле | Тип | Обяз. | Ограничения |
|------|-----|:-----:|-------------|
| `payer_id`     | string (uuid) | да  | Должен быть участником пространства |
| `amount_cents` | integer | да  | `> 0` |
| `spent_at`     | string (date) | да  | `YYYY-MM-DD` |
| `category_id`  | string (uuid) | нет | Категория из этого же пространства |
| `currency`     | string | нет | 3 символа; по умолчанию — валюта пространства |
| `description`  | string | нет | до 500 символов |

**201** → `Expense`

### `GET /api/v1/spaces/{spaceId}/expenses/{expenseId}`

Получить расход по id.

**200** → `Expense` &nbsp;·&nbsp; **404** → `Error`

### `PATCH /api/v1/spaces/{spaceId}/expenses/{expenseId}`

Изменить расход. Тело — `ExpenseInput` (те же правила, что при создании).

**200** → `Expense`

### `DELETE /api/v1/spaces/{spaceId}/expenses/{expenseId}`

Мягкое удаление (проставляет `deleted_at`).

**204** → без тела

---

## Балансы (`balances`)

### `GET /api/v1/spaces/{spaceId}/balances`

Баланс по каждому участнику пространства при делении поровну: сколько участник
заплатил против равной доли от суммарных трат пространства.

**200** → `Balance[]`

**`Balance`**

| Поле | Тип | Описание |
|------|-----|----------|
| `user_id`     | string (uuid) | |
| `paid_cents`  | integer | Сколько участник оплатил суммарно |
| `share_cents` | integer | Его равная доля от всех трат пространства |
| `net_cents`   | integer | `paid_cents − share_cents`; `> 0` — участнику должны, `< 0` — должен он |
