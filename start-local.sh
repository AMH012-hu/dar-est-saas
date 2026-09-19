#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required. Install it with: npm install --global pnpm@10"
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env. Review DATABASE_URL and JWT_SECRET, then run this script again."
  exit 1
fi

set -a
. ./.env
set +a

if [ ! -d node_modules ]; then
  pnpm install --frozen-lockfile
fi

if [ "${START_MYSQL:-0}" = "1" ]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is required when START_MYSQL=1."
    exit 1
  fi
  docker compose up -d mysql
  echo "Waiting for MySQL..."
  for _ in $(seq 1 30); do
    if docker inspect --format '{{.State.Health.Status}}' dar-est-mysql 2>/dev/null | grep -q healthy; then
      break
    fi
    sleep 2
  done
fi

if [ -z "${DATABASE_URL:-}" ] || [ -z "${JWT_SECRET:-}" ]; then
  echo "DATABASE_URL and JWT_SECRET must be set in .env"
  exit 1
fi

pnpm db:push
pnpm dev
