#!/usr/bin/env python3
"""Import a JSON export (e.g. Tiny Todo) into MONGODB_URI (Atlas or local)."""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def _parse(v):
    if isinstance(v, str) and ("T" in v or v.endswith("Z")):
        try:
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError:
            return v
    return v


def _clean(row: dict) -> dict:
    return {k: _parse(v) for k, v in row.items() if k != "_id"}


def main() -> int:
    p = argparse.ArgumentParser(description="Import export JSON into MongoDB")
    p.add_argument("input", help="Path to export JSON")
    p.add_argument("--mongodb-uri", default=os.environ.get("MONGODB_URI"), help="Target Mongo URI")
    p.add_argument("--db-name", default=os.environ.get("MONGODB_DB_NAME", "ai_sdlc"))
    args = p.parse_args()
    if not args.mongodb_uri:
        print("Set --mongodb-uri or MONGODB_URI", file=sys.stderr)
        return 1

    os.environ["MONGODB_URI"] = args.mongodb_uri
    os.environ["MONGODB_DB_NAME"] = args.db_name
    from app.config import get_settings
    get_settings.cache_clear()
    from app.database import get_database, init_db, reset_client_cache

    reset_client_cache()
    init_db()
    db = get_database()
    data = json.loads(Path(args.input).read_text())
    if "project" in data and "projects" not in data:
        data["projects"] = [data["project"]]

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
    print(
        f"Imported {len(collections['projects'])} projects, "
        f"{len(collections['documents'])} docs into {args.db_name}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
