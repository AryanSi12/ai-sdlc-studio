"""Notify the Orchestrator bot via webhook (optional)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


def notify_orchestrator(event: str, project_id: str, payload: dict[str, Any] | None = None) -> None:
    """POST {event, project_id, payload} to ORCHESTRATOR_WEBHOOK_URL if set."""
    settings = get_settings()
    body = {"event": event, "project_id": project_id, "payload": payload or {}}
    url = (settings.orchestrator_webhook_url or "").strip()
    if not url:
        logger.info("orchestrator webhook unset; event=%s project_id=%s payload=%s", event, project_id, body["payload"])
        return
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=body)
            resp.raise_for_status()
            logger.info("orchestrator notified event=%s status=%s", event, resp.status_code)
    except Exception as exc:  # noqa: BLE001 — webhook failures must not break API
        logger.warning("orchestrator webhook failed event=%s error=%s", event, exc)
