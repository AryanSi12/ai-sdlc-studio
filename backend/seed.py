"""Ensure the bot registry exists. Does NOT create sample projects."""
from __future__ import annotations

from app.database import get_database, init_db
from app.models import BOTS_SEED


def seed() -> None:
    init_db()
    db = get_database()
    for bot_id, name, role in BOTS_SEED:
        db.bots.update_one(
            {"id": bot_id},
            {"$set": {"id": bot_id, "name": name, "role": role, "status": "idle", "note": ""}},
            upsert=True,
        )
    print(f"Bot registry ready ({db.bots.count_documents({})} bots). No sample projects created.")


if __name__ == "__main__":
    seed()
