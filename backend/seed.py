"""Bot registry + optional first-boot Tiny Todo import from seed_data."""
from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path

from app.database import get_database, init_db
from app.models import BOTS_SEED

logger = logging.getLogger(__name__)

SEED_EXPORT = Path(__file__).resolve().parent / "seed_data" / "tiny-todo-export.json"


def _parse(v):
    if isinstance(v, str) and ("T" in v or v.endswith("Z")):
        try:
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError:
            return v
    return v


def _clean(row: dict) -> dict:
    return {k: _parse(v) for k, v in row.items() if k != "_id"}


def _import_export(db, data: dict) -> None:
    if "project" in data and "projects" not in data:
        data = {**data, "projects": [data["project"]]}

    collections = {
        "bots": data.get("bots") or [],
        "projects": data.get("projects") or [],
        "stages": data.get("stages") or [],
        "approvals": data.get("approvals") or [],
        "events": data.get("events") or [],
        "documents": data.get("documents") or [],
        "quiz_rounds": data.get("quiz_rounds") or [],
        "quiz_questions": data.get("quiz_questions") or [],
        "quiz_answers": data.get("quiz_answers") or [],
    }
    for coll, rows in collections.items():
        for row in rows:
            clean = _clean(row)
            if "id" not in clean:
                continue
            db[coll].update_one({"id": clean["id"]}, {"$set": clean}, upsert=True)
    logger.info(
        "Imported seed export: %s projects, %s docs, %s events",
        len(collections["projects"]),
        len(collections["documents"]),
        len(collections["events"]),
    )


def seed_tiny_todo_if_empty(db) -> None:
    """If projects is empty and the seed export exists, import it (idempotent upserts)."""
    if db.projects.count_documents({}) > 0:
        return
    if not SEED_EXPORT.is_file():
        logger.info("No seed export at %s; skipping Tiny Todo import", SEED_EXPORT)
        return
    data = json.loads(SEED_EXPORT.read_text())
    _import_export(db, data)


def seed() -> None:
    init_db()
    db = get_database()
    for bot_id, name, role in BOTS_SEED:
        db.bots.update_one(
            {"id": bot_id},
            {"$set": {"id": bot_id, "name": name, "role": role, "status": "idle", "note": ""}},
            upsert=True,
        )
    logger.info("Bot registry ready (%s bots).", db.bots.count_documents({}))
    seed_tiny_todo_if_empty(db)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed()
