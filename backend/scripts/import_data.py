#!/usr/bin/env python3
"""Import JSON export into the DB (upsert by id). Does not wipe unrelated projects."""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "ai_sdlc.db"
sys.path.insert(0, str(ROOT))


def upsert(cur, table: str, row: dict) -> None:
    cols = list(row.keys())
    placeholders = ",".join("?" for _ in cols)
    col_list = ",".join(cols)
    updates = ",".join(f"{c}=excluded.{c}" for c in cols if c != "id")
    sql = (
        f"INSERT INTO {table} ({col_list}) VALUES ({placeholders}) "
        f"ON CONFLICT(id) DO UPDATE SET {updates}"
    )
    cur.execute(sql, [row[c] for c in cols])


def main() -> int:
    p = argparse.ArgumentParser(description="Import AI SDLC Studio JSON export")
    p.add_argument("input")
    p.add_argument("--db", default=str(DEFAULT_DB))
    p.add_argument("--replace-all", action="store_true", help="Wipe all projects/stages/approvals/events first")
    args = p.parse_args()

    # Ensure tables exist (incl. new quiz/documents tables)
    import os
    os.environ.setdefault("DATABASE_URL", f"sqlite:///{Path(args.db).resolve()}")
    from app.config import get_settings
    get_settings.cache_clear()
    # Force settings to this DB
    os.environ["DATABASE_URL"] = f"sqlite:///{Path(args.db).resolve()}"
    get_settings.cache_clear()
    # Rebuild engine binding is tricky; use create_all via raw metadata on this sqlite file
    from sqlalchemy import create_engine
    from app.database import Base
    from app import models  # noqa: F401

    engine = create_engine(f"sqlite:///{Path(args.db).resolve()}", future=True)
    Base.metadata.create_all(bind=engine)
    # additive column
    with engine.begin() as conn:
        cols = {r[1] for r in conn.exec_driver_sql("PRAGMA table_info(projects)").fetchall()}
        if "quiz_complete" not in cols:
            conn.exec_driver_sql("ALTER TABLE projects ADD COLUMN quiz_complete BOOLEAN DEFAULT 0")

    data = json.loads(Path(args.input).read_text())
    db = Path(args.db)
    conn = sqlite3.connect(db)
    cur = conn.cursor()
    cur.execute("PRAGMA foreign_keys=ON")

    if args.replace_all:
        for t in ("quiz_answers", "quiz_questions", "quiz_rounds", "documents", "events", "approvals", "stages", "projects"):
            try:
                cur.execute(f"DELETE FROM {t}")
            except sqlite3.OperationalError:
                pass

    if "project" in data and "projects" not in data:
        data["projects"] = [data["project"]]

    for bot in data.get("bots") or []:
        upsert(cur, "bots", bot)
    for row in data.get("projects") or []:
        # drop unknown cols gracefully
        upsert(cur, "projects", {k: v for k, v in row.items() if k != "stages"})
    for row in data.get("stages") or []:
        upsert(cur, "stages", row)
    for row in data.get("approvals") or []:
        upsert(cur, "approvals", row)
    for row in data.get("events") or []:
        upsert(cur, "events", row)
    for row in data.get("documents") or []:
        upsert(cur, "documents", row)

    conn.commit()
    conn.close()
    print(
        f"Imported into {db}: "
        f"{len(data.get('projects') or [])} projects, "
        f"{len(data.get('events') or [])} events"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
