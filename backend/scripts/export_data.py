#!/usr/bin/env python3
"""Export projects (+ related) from local Mongo to JSON."""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def default(o):
    if isinstance(o, datetime):
        return o.isoformat()
    raise TypeError(type(o))


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--out", required=True)
    p.add_argument("--project-id", default=None)
    args = p.parse_args()
    from app.database import get_database, init_db

    init_db()
    db = get_database()
    q = {"id": args.project_id} if args.project_id else {}
    projects = list(db.projects.find(q, {"_id": 0}))
    pids = [p["id"] for p in projects]
    payload = {
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "projects": projects,
        "stages": list(db.stages.find({"project_id": {"$in": pids}}, {"_id": 0})) if pids else [],
        "approvals": list(db.approvals.find({"project_id": {"$in": pids}}, {"_id": 0})) if pids else [],
        "events": list(db.events.find({"project_id": {"$in": pids}}, {"_id": 0})) if pids else [],
        "documents": list(db.documents.find({"project_id": {"$in": pids}}, {"_id": 0})) if pids else [],
        "bots": list(db.bots.find({}, {"_id": 0})),
        "quiz_rounds": list(db.quiz_rounds.find({"project_id": {"$in": pids}}, {"_id": 0})) if pids else [],
        "quiz_questions": [],
        "quiz_answers": [],
    }
    Path(args.out).write_text(json.dumps(payload, indent=2, default=default))
    print(f"Wrote {args.out} ({len(projects)} projects, {len(payload['events'])} events)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
