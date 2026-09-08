#!/usr/bin/env bash
set -e
echo "========================================================"
echo "   ⚡ ZECRATARY - FULL-FEATURE PRODUCTION INSTALLER ⚡   "
echo "========================================================"

command -v node >/dev/null 2>&1 || { echo >&2 "Node.js v18+ is required."; exit 1; }

if [ ! -f .env ]; then cp .env.example .env; fi
if [ ! -f apps/web/.env.local ]; then cp .env.example apps/web/.env.local; fi

npm install

if command -v docker >/dev/null 2>&1; then
  echo "Booting PostgreSQL & Redis containers..."
  docker compose up -d
fi

npm run db:generate
npm run db:push

echo "========================================================"
echo "   ✅ ZECRATARY IS INSTALLED AND READY!                 "
echo "   Run 'npm run dev' to launch web UI (port 3000)      "
echo "   Run 'npm run worker:dev' to start async queue       "
echo "========================================================"
