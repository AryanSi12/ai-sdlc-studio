# AI SDLC Studio — Backend

FastAPI API for the AI SDLC Studio governance console.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## Run

```bash
# from backend/
source .venv/bin/activate
python seed.py          # load mock projects
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Health: `GET http://127.0.0.1:8000/health`

## Env

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `sqlite:///./ai_sdlc.db` | SQLite or Postgres URL |
| `BOT_TOKEN` | `dev-bot-token-change-me` | Shared secret for `X-Bot-Token` on `POST /api/events` |
| `ORCHESTRATOR_WEBHOOK_URL` | _(empty)_ | Optional Grok Bot webhook; logs if unset |
| `ORCHESTRATOR_WEBHOOK_KEY` | _(empty)_ | Grok Bot webhook sender key (sent as Bearer + X-Automation-Key) |
| `CORS_ORIGINS` | localhost Vite ports | Comma-separated allowed origins |

## Bot event example

```bash
curl -X POST http://127.0.0.1:8000/api/events \
  -H "Content-Type: application/json" \
  -H "X-Bot-Token: dev-bot-token-change-me" \
  -d '{
    "project_id": "p1-novapay",
    "bot": "developer",
    "action": "Opened draft PR #43",
    "reason": "Story NP-04 complete",
    "stage_name": "development",
    "stage_status": "active",
    "output_label": "Pull Request",
    "output_url": "https://github.com/acme/novapay/pull/43"
  }'
```

## Tests

```bash
pytest -q
```
