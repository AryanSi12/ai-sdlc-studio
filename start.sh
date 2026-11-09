#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "==> Backend venv"
cd backend
if [ ! -d .venv ]; then python3 -m venv .venv; fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt
[ -f .env ] || cp .env.example .env
python seed.py
if [ -f ../data/tiny-todo-export.json ] && [ ! -f ai_sdlc.db ]; then
  python scripts/import_data.py ../data/tiny-todo-export.json || true
fi
uvicorn app.main:app --host "${HOST:-127.0.0.1}" --port "${PORT:-8000}" &
BACK_PID=$!
cd "$ROOT"

echo "==> Frontend"
cd frontend
if [ ! -d node_modules ]; then npm install; fi
[ -f .env ] || echo "VITE_API_URL=http://127.0.0.1:8000" > .env
npm run dev -- --host 127.0.0.1 --port 5173 &
FRONT_PID=$!
cd "$ROOT"

echo ""
echo "Backend  http://127.0.0.1:8000/health  (pid $BACK_PID)"
echo "Frontend http://127.0.0.1:5173         (pid $FRONT_PID)"
echo "Press Ctrl+C to stop."
trap 'kill $BACK_PID $FRONT_PID 2>/dev/null || true' EXIT
wait
