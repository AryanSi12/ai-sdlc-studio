from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


def as_iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def parse_dt(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    return None


BOTS_SEED = [
    ("orchestrator", "Orchestrator", "Manager"),
    ("requirement_gatherer", "Requirement Gatherer", "Requirements"),
    ("designer", "Designer", "Architecture"),
    ("developer", "Developer", "Implementation"),
    ("tester", "Tester", "QA"),
    ("deployer", "Deployer", "Release"),
    ("maintainer", "Maintainer", "Existing repos"),
]
