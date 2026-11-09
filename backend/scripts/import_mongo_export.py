#!/usr/bin/env python3
"""Import JSON export into MongoDB / mongomock (upsert by id)."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.database import get_database, init_db, reset_client_cache


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("input")
    p.add_argument("--replace-all", action="store_true")
    args = p.parse_args()

    reset_client_cache()
    init_db()
    db = get_database()
    data = json.loads(Path(args.input).read_text())

    if args.replace_all:
        for name in (
            "quiz_answers", "quiz_questions", "quiz_rounds", "documents",
            "events", "approvals", "stages", "projects",
        ):
            db[name].delete_many({})

    if "project" in data and "projects" not in data:
        data["projects"] = [data["project"]]

    for coll, key in (
        ("bots", "bots"),
        ("projects", "projects"),
        ("stages", "stages"),
        ("approvals", "approvals"),
        ("events", "events"),
        ("documents", "documents"),
        ("quiz_rounds", "quiz_rounds"),
        ("quiz_questions", "quiz_questions"),
        ("quiz_answers", "quiz_answers"),
    ):
        for row in data.get(key) or []:
            if "id" not in row:
                continue
            # strip nested stages if present on project
            clean = {k: v for k, v in row.items() if k != "stages"}
            db[coll].update_one({"id": clean["id"]}, {"$set": clean}, upsert=True)

    print(
        "imported",
        f"projects={db.projects.count_documents({})}",
        f"stages={db.stages.count_documents({})}",
        f"docs={db.documents.count_documents({})}",
        f"events={db.events.count_documents({})}",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
