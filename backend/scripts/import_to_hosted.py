#!/usr/bin/env python3
"""Import a JSON export (e.g. Tiny Todo) into a hosted DATABASE_URL (Postgres or SQLite)."""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def main() -> int:
    p = argparse.ArgumentParser(description="Import export JSON into DATABASE_URL")
    p.add_argument("input", help="Path to export JSON")
    p.add_argument("--database-url", default=os.environ.get("DATABASE_URL"), help="Target DB URL (required)")
    args = p.parse_args()
    if not args.database_url:
        print("Set --database-url or DATABASE_URL", file=sys.stderr)
        return 1

    os.environ["DATABASE_URL"] = args.database_url
    from app.config import get_settings
    get_settings.cache_clear()

    # Re-bind engine for this process
    import app.database as dbmod
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.database import Base, _normalize_db_url
    from app import models  # noqa: F401
    from app.models import Bot, Project, Stage, Approval, Event, Document

    url = _normalize_db_url(args.database_url)
    engine = create_engine(url, future=True)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, future=True)
    data = json.loads(Path(args.input).read_text())
    if "project" in data and "projects" not in data:
        data["projects"] = [data["project"]]

    def upsert(session, model, row: dict, skip=()):
        obj = session.get(model, row["id"])
        clean = {k: v for k, v in row.items() if k not in skip and hasattr(model, k)}
        if obj is None:
            session.add(model(**clean))
        else:
            for k, v in clean.items():
                if k != "id":
                    setattr(obj, k, v)

    with Session() as session:
        for row in data.get("bots") or []:
            upsert(session, Bot, row)
        for row in data.get("projects") or []:
            upsert(session, Project, row)
        for row in data.get("stages") or []:
            upsert(session, Stage, row)
        for row in data.get("approvals") or []:
            upsert(session, Approval, row)
        for row in data.get("events") or []:
            upsert(session, Event, row)
        for row in data.get("documents") or []:
            upsert(session, Document, row)
        session.commit()
    print(f"Imported {len(data.get('projects') or [])} projects into {url.split('@')[-1]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
