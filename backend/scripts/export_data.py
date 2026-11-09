#!/usr/bin/env python3
"""Export all (or one) projects from the live DB to JSON."""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "ai_sdlc.db"


def rows(cur, sql, args=()):
    cur.execute(sql, args)
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def main() -> int:
    p = argparse.ArgumentParser(description="Export AI SDLC Studio DB to JSON")
    p.add_argument("--db", default=str(DEFAULT_DB))
    p.add_argument("--project-id", default=None, help="Export only this project")
    p.add_argument("-o", "--output", required=True)
    args = p.parse_args()

    db = Path(args.db)
    if not db.exists():
        print(f"DB not found: {db}", file=sys.stderr)
        return 1

    conn = sqlite3.connect(db)
    cur = conn.cursor()
    if args.project_id:
        projects = rows(cur, "SELECT * FROM projects WHERE id=?", (args.project_id,))
        if not projects:
            print(f"Project not found: {args.project_id}", file=sys.stderr)
            return 1
        pids = [args.project_id]
    else:
        projects = rows(cur, "SELECT * FROM projects")
        pids = [x["id"] for x in projects]

    payload = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "projects": projects,
        "stages": [],
        "approvals": [],
        "events": [],
        "documents": [],
        "bots": rows(cur, "SELECT * FROM bots"),
    }
    for pid in pids:
        payload["stages"].extend(rows(cur, "SELECT * FROM stages WHERE project_id=?", (pid,)))
        payload["approvals"].extend(rows(cur, "SELECT * FROM approvals WHERE project_id=?", (pid,)))
        payload["events"].extend(rows(cur, "SELECT * FROM events WHERE project_id=?", (pid,)))
        try:
            payload.setdefault("documents", []).extend(rows(cur, "SELECT * FROM documents WHERE project_id=?", (pid,)))
        except Exception:
            pass
    conn.close()

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2, default=str))
    print(f"Wrote {out} ({len(projects)} projects, {len(payload['events'])} events)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
