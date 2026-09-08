SHELL := /bin/bash
LOCAL_BIN := $(CURDIR)/backend/bin
export PATH := $(LOCAL_BIN):$(PATH)

# Load .env if present (for DATABASE_URL etc.)
ifneq (,$(wildcard ./.env))
include .env
export
endif

DATABASE_URL ?= postgres://tracker:tracker@localhost:5432/tracker?sslmode=disable

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ----------------------------------------------------------------------------
# Dependencies (the only targets that hit the network)
# ----------------------------------------------------------------------------
.PHONY: deps deps-web deps-backend tools
deps: deps-web deps-backend tools ## Install all dependencies + dev tools

deps-web: ## Install frontend deps (pnpm)
	pnpm install

deps-backend: ## Download Go modules
	cd backend && go mod download

tools: ## Install Go dev tools (sqlc) into backend/bin
	GOBIN=$(LOCAL_BIN) go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
	# goose is used as a library by ./backend/cmd/migrate — no binary needed.

# ----------------------------------------------------------------------------
# Database
# ----------------------------------------------------------------------------
.PHONY: db-up db-down db-reset psql
db-up: ## Start Postgres in docker
	docker compose up -d postgres

db-down: ## Stop Postgres
	docker compose stop postgres

db-reset: ## Drop the Postgres volume and recreate (DESTROYS DATA)
	docker compose down -v
	docker compose up -d postgres

psql: ## Open a psql shell against the dev DB
	docker compose exec postgres psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)

# ----------------------------------------------------------------------------
# Migrations (goose, driven by ./backend/cmd/migrate — no goose binary required)
# ----------------------------------------------------------------------------
.PHONY: migrate-up migrate-down migrate-status migrate-create
migrate-up: ## Apply all pending migrations
	cd backend && DATABASE_URL="$(DATABASE_URL)" go run ./cmd/migrate -command up

migrate-down: ## Roll back the last migration
	cd backend && DATABASE_URL="$(DATABASE_URL)" go run ./cmd/migrate -command down

migrate-status: ## Show migration status
	cd backend && DATABASE_URL="$(DATABASE_URL)" go run ./cmd/migrate -command status

migrate-create: ## Create a new migration:  make migrate-create name=add_something
	cd backend && go run ./cmd/migrate -command create $(name) sql

# ----------------------------------------------------------------------------
# Code generation
# ----------------------------------------------------------------------------
.PHONY: gen sqlc openapi
gen: sqlc openapi ## Run all code generation

sqlc: ## Generate typed DB code from SQL (sqlc)
	cd backend && sqlc generate

openapi: ## Generate frontend TS types from api/openapi.yaml
	pnpm --filter web openapi:gen

# ----------------------------------------------------------------------------
# Run
# ----------------------------------------------------------------------------
.PHONY: run-api run-web dev
run-api: ## Run the Go API server
	cd backend && go run ./cmd/api

run-web: ## Run the Vite dev server
	pnpm --filter web dev

dev: ## Run API + web together
	$(MAKE) -j2 run-api run-web

# ----------------------------------------------------------------------------
# Quality
# ----------------------------------------------------------------------------
.PHONY: lint lint-backend lint-web test test-backend test-web build
lint: lint-backend lint-web ## Lint everything

lint-backend:
	cd backend && golangci-lint run

lint-web:
	pnpm -r lint

test: test-backend test-web ## Test everything

test-backend:
	cd backend && go test ./...

test-web:
	pnpm -r test --if-present

build: ## Build backend binary + frontend bundle
	cd backend && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o bin/api ./cmd/api
	pnpm --filter web build
