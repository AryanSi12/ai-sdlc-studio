"""Ensure the bot registry exists. Does NOT create sample projects."""

from __future__ import annotations

from app.database import SessionLocal, init_db
from app.models import Bot

BOTS = [
    ("orchestrator", "Orchestrator", "Manager"),
    ("requirement_gatherer", "Requirement Gatherer", "Requirements"),
    ("designer", "Designer", "Architecture"),
    ("developer", "Developer", "Implementation"),
    ("tester", "Tester", "QA"),
    ("deployer", "Deployer", "Release"),
    ("maintainer", "Maintainer", "Existing repos"),
]


def seed() -> None:
    init_db()
    db = SessionLocal()
    try:
        for bot_id, name, role in BOTS:
            existing = db.get(Bot, bot_id)
            if existing:
                existing.name = name
                existing.role = role
            else:
                db.add(Bot(id=bot_id, name=name, role=role, status="idle", note=""))
        db.commit()
        print(f"Bot registry ready ({db.query(Bot).count()} bots). No sample projects created.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
