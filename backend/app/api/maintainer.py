from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.database import get_db
from app.serialize import get_project

router = APIRouter(prefix="/api/maintainer", tags=["maintainer"])


@router.get("/{project_id}")
def maintainer_view(project_id: str, db: Database = Depends(get_db)) -> dict:
    project = get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.get("type") != "existing" and not project.get("repo_url"):
        return {"project_id": project_id, "findings": [], "summary": None, "repo_url": None}
    # Findings may be stored as events or a dedicated collection; keep empty-compatible shape
    findings = list(db.findings.find({"project_id": project_id}, {"_id": 0})) if "findings" in db.list_collection_names() else []
    summary_doc = db.documents.find_one(
        {"project_id": project_id, "kind": "codebase_summary"}, {"_id": 0}, sort=[("created_at", -1)]
    )
    return {
        "project_id": project_id,
        "repo_url": project.get("repo_url"),
        "findings": findings,
        "summary": summary_doc["markdown"] if summary_doc else None,
    }
