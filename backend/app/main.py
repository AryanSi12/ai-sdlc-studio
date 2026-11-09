from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api import approvals, bots, documents, events, inbox, maintainer, projects, quiz
from app.config import get_settings
from app.database import init_db
from app.services.ws_hub import hub

logging.basicConfig(level=logging.INFO)

settings = get_settings()

app = FastAPI(title="AI SDLC Studio API", version="0.1.0")

_cors_origins = settings.cors_origin_list or ["*"]
_cors_star = _cors_origins == ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    # Starlette forbids credentials with allow_origins=["*"]; API uses bearer/header auth anyway.
    allow_credentials=not _cors_star,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=None if _cors_star else settings.cors_origin_regex,
)

app.include_router(projects.router)
app.include_router(quiz.router)
app.include_router(documents.router)
app.include_router(inbox.router)
app.include_router(events.router)
app.include_router(approvals.router)
app.include_router(bots.router)
app.include_router(maintainer.router)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    try:
        from seed import seed
        seed()
    except Exception:
        logging.exception("seed on startup failed")


@app.get("/health")
@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.websocket("/ws/projects/{project_id}")
async def project_ws(project_id: str, websocket: WebSocket) -> None:
    await hub.connect(project_id, websocket)
    try:
        while True:
            # Keepalive / ignore client pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        await hub.disconnect(project_id, websocket)


# Serve the built frontend (backend/static) from the same origin when present,
# so the whole app runs with only Python installed.
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
if STATIC_DIR.is_dir() and (STATIC_DIR / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        candidate = STATIC_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
