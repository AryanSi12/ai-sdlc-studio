"""Stage progression helpers for the SDLC pipeline (Mongo)."""
from __future__ import annotations

from datetime import datetime, timezone

from pymongo.database import Database

STAGE_ORDER = ["requirements", "design", "development", "testing", "deployment"]

STAGE_BOT = {
    "requirements": "requirement_gatherer",
    "design": "designer",
    "development": "developer",
    "testing": "tester",
    "deployment": "deployer",
}

STAGE_LABEL = {
    "requirements": "Requirements",
    "design": "Design",
    "development": "Development",
    "testing": "Testing",
    "deployment": "Deployment",
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def next_stage_name(current: str) -> str | None:
    try:
        idx = STAGE_ORDER.index(current)
    except ValueError:
        return None
    if idx + 1 >= len(STAGE_ORDER):
        return None
    return STAGE_ORDER[idx + 1]


def get_stage(db: Database, project_id: str, name: str) -> dict | None:
    return db.stages.find_one({"project_id": project_id, "name": name}, {"_id": 0})


def mark_stage(db: Database, project_id: str, name: str, status: str) -> dict | None:
    stage = get_stage(db, project_id, name)
    if not stage:
        return None
    now = utcnow()
    updates: dict = {"status": status}
    if status in ("active", "clarifying") and not stage.get("started_at"):
        updates["started_at"] = now
    if status in ("done", "failed"):
        updates["ended_at"] = now
    db.stages.update_one({"project_id": project_id, "name": name}, {"$set": updates})
    return get_stage(db, project_id, name)


def create_stages(db: Database, project_id: str, *, requirements_status: str = "active") -> None:
    from app.models import new_id

    docs = []
    for idx, name in enumerate(STAGE_ORDER):
        status = requirements_status if idx == 0 else "pending"
        docs.append(
            {
                "id": new_id(),
                "project_id": project_id,
                "name": name,
                "status": status,
                "bot": STAGE_BOT[name],
                "output_label": None,
                "output_url": None,
                "started_at": utcnow() if idx == 0 else None,
                "ended_at": None,
            }
        )
    if docs:
        db.stages.insert_many(docs)
