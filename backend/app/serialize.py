from __future__ import annotations

from datetime import datetime
from typing import Any

from pymongo.database import Database

from app.services.pipeline import STAGE_ORDER


def project_summary(p: dict) -> dict:
    return {
        "id": p["id"],
        "name": p["name"],
        "description": p.get("description") or "",
        "type": p["type"],
        "repo_url": p.get("repo_url"),
        "current_stage": p.get("current_stage") or "requirements",
        "status": p.get("status") or "running",
        "active_bot": p.get("active_bot") or "orchestrator",
        "quiz_complete": bool(p.get("quiz_complete", False)),
        "created_at": p["created_at"],
        "updated_at": p["updated_at"],
    }


def project_detail(db: Database, p: dict) -> dict:
    stages = list(db.stages.find({"project_id": p["id"]}, {"_id": 0}))
    stages.sort(key=lambda s: STAGE_ORDER.index(s["name"]) if s["name"] in STAGE_ORDER else 99)
    approvals = list(db.approvals.find({"project_id": p["id"]}, {"_id": 0}).sort("created_at", -1))
    events = list(db.events.find({"project_id": p["id"]}, {"_id": 0}).sort("created_at", -1).limit(50))
    for a in approvals:
        a["project_name"] = p["name"]
        a["project_stage"] = p.get("current_stage")
    for e in events:
        e["project_name"] = p["name"]
    return {
        **project_summary(p),
        "spec_md": p.get("spec_md"),
        "stages": stages,
        "approvals": approvals,
        "events": events,
    }


def get_project(db: Database, project_id: str) -> dict | None:
    return db.projects.find_one({"id": project_id}, {"_id": 0})
