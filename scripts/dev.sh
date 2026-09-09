#!/usr/bin/env bash
# Local dev orchestrator: Postgres (docker) + API (:8090) + Vite (:5173).
#
# The API runs on :8090 (not the usual :8080) because 8080 is taken by another
# process on this machine; the Vite proxy is pointed at :8090 to match.
#
# Usage:
#   scripts/dev.sh          # or `up` — start whatever is not running
#   scripts/dev.sh status   # just report what is up / down
#   scripts/dev.sh down      # stop the API and Vite (Postgres is left running)
#   scripts/dev.sh logs      # tail the API + Vite logs
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

API_PORT="8090"
WEB_PORT="5173"
DB_URL="postgres://tracker:tracker@localhost:5432/tracker?sslmode=disable"
RUN_DIR="$ROOT/.dev"
mkdir -p "$RUN_DIR"

pg_up()  { docker compose ps --status running --services 2>/dev/null | grep -qx postgres; }
api_up() { curl -fsS -m 2 "http://localhost:$API_PORT/healthz" >/dev/null 2>&1; }
web_up() { curl -fsS -m 2 -o /dev/null "http://localhost:$WEB_PORT/" >/dev/null 2>&1; }

wait_for() { # wait_for <fn> <label>
  for _ in $(seq 1 30); do "$1" && return 0; sleep 1; done
  echo "✗ $2 did not come up in time"; return 1
}

start_pg() {
  if pg_up; then echo "✓ postgres already running"; return; fi
  echo "→ starting postgres…"
  docker compose up -d postgres
  for _ in $(seq 1 30); do
    [ "$(docker inspect -f '{{.State.Health.Status}}' expence-tracker-pg 2>/dev/null)" = healthy ] && break
    sleep 1
  done
  echo "✓ postgres up"
  echo "→ applying migrations…"
  ( cd backend && DATABASE_URL="$DB_URL" go run ./cmd/migrate -command up )
}

start_api() {
  if api_up; then echo "✓ api already running on :$API_PORT"; return; fi
  echo "→ starting api on :$API_PORT…"
  ( cd backend && \
      HTTP_ADDR=":$API_PORT" APP_ENV=local \
      DATABASE_URL="$DB_URL" \
      WEB_ORIGIN="http://localhost:$WEB_PORT" \
      JWT_SECRET=change-me-in-production \
      nohup go run ./cmd/api > "$RUN_DIR/api.log" 2>&1 & echo $! > "$RUN_DIR/api.pid" )
  wait_for api_up "api" || { tail -n 20 "$RUN_DIR/api.log"; exit 1; }
  echo "✓ api up  (logs: .dev/api.log)"
}

start_web() {
  if web_up; then echo "✓ web already running on :$WEB_PORT"; return; fi
  echo "→ starting vite on :$WEB_PORT…"
  API_PROXY_TARGET="http://localhost:$API_PORT" \
    nohup pnpm --filter web dev > "$RUN_DIR/web.log" 2>&1 & echo $! > "$RUN_DIR/web.pid"
  wait_for web_up "web" || { tail -n 20 "$RUN_DIR/web.log"; exit 1; }
  echo "✓ web up  (logs: .dev/web.log)"
}

status() {
  pg_up  && echo "postgres  : UP" || echo "postgres  : DOWN"
  api_up && echo "api  :$API_PORT : UP" || echo "api  :$API_PORT : DOWN"
  web_up && echo "web  :$WEB_PORT : UP" || echo "web  :$WEB_PORT : DOWN"
}

kill_port() { # kill_port <port> — stop whatever is LISTENing on it
  local port="$1" pids
  pids="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  [ -n "$pids" ] || return 0
  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true
  sleep 1
  pids="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  # shellcheck disable=SC2086
  [ -n "$pids" ] && kill -9 $pids 2>/dev/null || true
}

down() {
  for svc in api web; do
    f="$RUN_DIR/$svc.pid"
    [ -f "$f" ] || continue
    pid="$(cat "$f")"
    pkill -TERM -P "$pid" 2>/dev/null || true   # go run / pnpm child processes
    kill -TERM "$pid" 2>/dev/null || true
    rm -f "$f"
  done
  kill_port "$API_PORT" && echo "stopped api (:$API_PORT)"
  kill_port "$WEB_PORT" && echo "stopped web (:$WEB_PORT)"
  echo "(postgres left running — 'docker compose stop postgres' to stop it too)"
}

case "${1:-up}" in
  up)     start_pg; start_api; start_web; echo; status; echo; echo "→ open http://localhost:$WEB_PORT" ;;
  status) status ;;
  down)   down ;;
  logs)   tail -n 40 -F "$RUN_DIR/api.log" "$RUN_DIR/web.log" ;;
  *)      echo "usage: scripts/dev.sh [up|status|down|logs]"; exit 1 ;;
esac
