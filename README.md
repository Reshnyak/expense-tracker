# Expence Tracker

Shared expense journal — a monorepo with a React SPA and a Go API.

## Stack

| Layer        | Choice |
|--------------|--------|
| Monorepo     | pnpm workspaces (`apps/*`) + root `Makefile`; backend is its own Go module |
| Frontend     | React 19 + Vite + TypeScript, React Router, TanStack Query, Tailwind v4 |
| Backend      | Go 1.25 + Gin |
| Database     | PostgreSQL 17, no ORM — `pgx/v5` (`pgxpool`) |
| SQL access   | `sqlc` (codegen from `.sql`, `pgx/v5` driver) |
| Migrations   | `goose` (SQL up/down in one file) |
| Auth         | Google OAuth 2.0 + JWT access/refresh |
| API contract | `api/openapi.yaml` — source of truth; frontend types generated from it |

## Layout

```
api/openapi.yaml          API contract (source of truth)
apps/web/                  React SPA
backend/                   Go module: cmd/{api,migrate}, internal/*, migrations/
backend/internal/db/       pgxpool + queries/*.sql; sqlc output in db/sqlc/ (git-ignored)
Makefile                   orchestrates web + backend + DB
docker-compose.yaml        Postgres 17 (+ optional Adminer)
```

## Requirements

- Node 22 + pnpm 9
- Go 1.25
- Docker (for Postgres)

## Quick start

```bash
cp .env.example .env
make db-up          # start Postgres
make deps           # install web + Go deps, install sqlc into backend/bin
make migrate-up     # apply migrations (via ./backend/cmd/migrate — no goose binary)
make gen            # sqlc generate + openapi -> TS types
make dev            # run API (:8080) and web (:5173) together
```

`make help` lists every target.

## First-time notes

- **Go module path** is a placeholder (`github.com/reshnyakdg/expence-tracker/backend`).
  Change it: `cd backend && go mod edit -module <path>` and update imports, then `go mod tidy`.
- `apps/web/src/shared/api/schema.d.ts` is generated from `api/openapi.yaml` by
  `make openapi`; it is committed so the app type-checks right after checkout.
- All handlers currently return `501 Not Implemented`; only `GET /healthz` is live.

## Development

| Task | Command |
|------|---------|
| Run API only | `make run-api` |
| Run web only | `make run-web` |
| New migration | `make migrate-create name=add_x` |
| Regenerate code | `make gen` |
| Lint / test | `make lint` / `make test` |
| Build | `make build` |
