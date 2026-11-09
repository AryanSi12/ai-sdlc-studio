"""In-memory WebSocket fan-out for project updates."""

from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ProjectWSHub:
    def __init__(self) -> None:
        self._rooms: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, project_id: str, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._rooms[project_id].add(ws)

    async def disconnect(self, project_id: str, ws: WebSocket) -> None:
        async with self._lock:
            self._rooms[project_id].discard(ws)
            if not self._rooms[project_id]:
                self._rooms.pop(project_id, None)

    async def broadcast(self, project_id: str, message: dict[str, Any]) -> None:
        payload = json.dumps(message, default=str)
        async with self._lock:
            sockets = list(self._rooms.get(project_id, set()))
        dead: list[WebSocket] = []
        for ws in sockets:
            try:
                await ws.send_text(payload)
            except Exception:  # noqa: BLE001
                dead.append(ws)
        for ws in dead:
            await self.disconnect(project_id, ws)


hub = ProjectWSHub()


def schedule_broadcast(project_id: str, message: dict[str, Any]) -> None:
    """Fire-and-forget broadcast from sync route handlers."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        logger.debug("no running loop; skip ws broadcast for %s", project_id)
        return
    loop.create_task(hub.broadcast(project_id, message))
