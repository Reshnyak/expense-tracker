# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Shared expense journal ("общий журнал расходов"): users sign in with Google, create *spaces*, invite members, and record expenses. Per-member balances are computed on the fly (equal split), never stored.

Status: **scaffold**. Every HTTP handler returns `501 Not Implemented` except `GET /healthz`. `internal/service` and `internal/domain` are empty stubs. Dependency versions in `backend/go.mod` and `apps/web/package.json` are indicative until `go mod tidy` / `pnpm install` lock them.

## Git conventions

- **Ветвление — GitHub Flow.** Каждая задача делается в отдельной фича-ветке от `main`
  (`feat/<кратко>`, `fix/<кратко>`), затем merge в `main` через Pull Request. В `main`
  напрямую не коммитить.
- **Коммиты — Conventional Commits** (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`,
  `test:`, `build:` …) с опциональным скоупом (`feat(web): …`, `fix(backend): …`).
  Описание коммита — **на русском**, повелительное наклонение, с маленькой буквы:
  `feat(web): добавить главный экран трекера расходов`.

## Repo shape

Monorepo, but the two halves use different tooling:

- **`apps/web/`** — React SPA, part of the pnpm workspace (`pnpm-workspace.yaml` globs `apps/*` only).
- **`backend/`** — a **separate Go module**. Run all `go` commands from inside `backend/`.
- **Root `Makefile`** is the orchestrator — it is the intended entrypoint for every task; the raw `go`/`pnpm`/`goose`/`sqlc` commands below are what it runs.

## Commands

```bash
make deps           # install web deps + Go modules + sqlc into backend/bin  (only network target)
make gen            # sqlc generate  +  openapi -> TS types   (run after deps and after changing SQL or openapi.yaml)
make db-up          # start Postgres 17 in Docker
make migrate-up     # apply goose migrations   (migrate-down / migrate-status / migrate-create name=foo)
make dev            # run API (:8080) and Vite (:5173) together
make run-api        # backend only          == cd backend && go run ./cmd/api
make run-web        # frontend only         == pnpm --filter web dev
make lint           # golangci-lint (backend) + eslint (web)
make test           # go test ./... (backend) + pnpm -r test (web)
make build          # backend binary -> backend/bin/api ; web bundle -> apps/web/dist
```

Backend-specific (from `backend/`):

```bash
go build ./...
go test ./...
go test ./internal/auth/ -run TestAccessTokenRoundTrip -v   # single test
golangci-lint run                                           # config is schema v2
./bin/sqlc generate                                         # == make sqlc
```

Frontend-specific (from `apps/web/`): `pnpm build` (`tsc --noEmit` then `vite build`), `pnpm typecheck`, `pnpm lint`, `pnpm openapi:gen`.

Nothing compiles on a fresh checkout until `make deps` (and `make gen` for the sqlc package and real TS types).

## Code generation contract

`api/openapi.yaml` is the **source of truth** for the HTTP API.

- Frontend: `make openapi` runs `openapi-typescript` → `apps/web/src/shared/api/schema.d.ts`. That file is a **hand-written placeholder** committed so the app type-checks pre-codegen; regen overwrites it. `apps/web/src/shared/api/types.ts` re-exports the named schema types — import app types from there, not from `schema.d.ts`.
- Backend: `backend/internal/httpapi/dto/dto.go` mirrors the OpenAPI schemas **by hand** — keep it in sync when editing the spec.
- Changing an endpoint = edit `openapi.yaml`, then update `dto.go`, the handler, and run `make openapi`.

`sqlc`: SQL lives in `backend/internal/db/queries/*.sql`; schema is read from `backend/migrations/`; output goes to `backend/internal/db/sqlc/` (git-ignored — run `make sqlc` after checkout). Driver is `pgx/v5`; `sqlc.yaml` maps `uuid` → `github.com/google/uuid`.

## Backend architecture

Composition happens in `backend/cmd/api/main.go`: load config → open `pgxpool` → build `auth.TokenIssuer` + `auth.GoogleAuthenticator` → `httpapi.NewRouter(httpapi.Deps{...})` → `platform.RunServer` (signal-driven graceful shutdown).

- **`internal/config`** — layered viper load: `config/default.yaml`, then `config/<APP_ENV>.yaml` (missing overlay is not an error), then environment overrides. Nested keys map with `_`: `http.addr` → `HTTP_ADDR`, `database.url` → `DATABASE_URL`, `jwt.secret` → `JWT_SECRET`, etc. (see `bindEnv`). `APP_ENV` is read from the real environment and defaults to `local`.
- **`internal/httpapi`** — `NewRouter` builds the Gin engine. Middleware order: `Recovery` → `RequestID` → `Logger` (slog) → `CORS`. Two route groups under `/api/v1`: `/auth/*` is public; everything else sits behind `middleware.AuthRequired(issuer)`, which parses the `Bearer` access token and stores the user id — read it back with `middleware.UserID(c)`.
- **`internal/httpapi/handlers`** — `Handlers` struct carries `DB *pgxpool.Pool`, `Issuer`, `Google`, `Log`. One file per resource; every method currently calls `notImplemented(c)`.
- **`internal/auth`** — `TokenIssuer` signs/parses HS256 access tokens (subject = user UUID); `ParseAccess` errors wrap `ErrInvalidToken`. `GoogleAuthenticator` wraps `oauth2.Config` + a userinfo fetch.
- **`internal/service`** / **`internal/domain`** — where business logic and framework-free entities/interfaces are meant to go. Handlers should call into `service`, which orchestrates the generated sqlc queries.
- **`internal/platform`** — logging (`slog`, json or text) and the HTTP server lifecycle helper.
- **`cmd/migrate`** — the migration runner: goose used as a library with only the pgx driver, so no `goose` binary is needed. `make migrate-*` shells out to `go run ./cmd/migrate`.

Module path `github.com/reshnyakdg/expence-tracker/backend` is a placeholder — change it with `go mod edit -module <path>` plus an import rewrite (see the comment at the top of `go.mod`).

## Frontend architecture

Vite + React 19, path alias `@/` → `apps/web/src/`. In dev, `/api` and `/healthz` are proxied to `localhost:8080` (`vite.config.ts`).

- **`src/shared/api/http.ts`** — the fetch wrapper (`api.get/post/patch/delete`). On `401` with a stored refresh token it calls `POST /v1/auth/refresh` once (single-flight via `refreshInFlight`), retries the request, and on failure clears tokens. Throws `HttpError`.
- **`src/shared/auth/`** — `tokenStore` persists tokens in `localStorage` behind try/catch and notifies subscribers; `AuthContext` subscribes and (re)fetches `GET /v1/me` whenever tokens change, exposing `useAuth()`; `RequireAuth` is the route guard.
- **`src/app/`** — `router.tsx` (data router; `/login` public, `/` wrapped in `RequireAuth` + `App` shell) and `queryClient.ts`.
- **`src/features/<domain>/`** — TanStack Query hooks only (`useSpaces`, `useExpenses` + `useBalances`, `useCategories`). Query keys are `["spaces"]`, `["spaces", spaceId, "expenses"]`, etc.; mutations invalidate the matching key (creating an expense also invalidates that space's balances).
- **`src/pages/`** — route components composed from feature hooks.

## Data model (migration `00001_init.sql`)

`users` — `google_sub` unique, `email` is `citext`.
`spaces` — `owner_id` → users, `currency char(3)`.
`space_members` — PK `(space_id, user_id)`, `role` in `('owner','member')`.
`categories` — per space, `unique (space_id, name)`.
`expenses` — `amount_cents bigint` (minor units, `> 0`), `payer_id` + `created_by` → users, `category_id` nullable, `deleted_at` for soft delete; the list index is partial on `deleted_at IS NULL`.

Balances are query-only: `SpaceBalances` sums each member's payments minus an equal share of the space's total spend (`net_cents > 0` ⇒ the member is owed money).
