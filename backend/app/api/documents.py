from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database
from pydantic import BaseModel

from app.api.deps import require_bot_token
from app.database import get_db
from app.models import new_id, utcnow
from app.schemas.quiz_docs import DocumentCreateIn, DocumentOut
from app.serialize import get_project
from app.services.orchestrator import notify_orchestrator
from app.services.ws_hub import schedule_broadcast

router = APIRouter(prefix="/api/projects", tags=["documents"])


def _doc_out(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "project_id": doc["project_id"],
        "kind": doc["kind"],
        "title": doc["title"],
        "markdown": doc["markdown"],
        "created_by_bot": doc.get("created_by_bot") or "orchestrator",
        "created_at": doc["created_at"],
        "viewer_path": f"/projects/{doc['project_id']}/docs/{doc['id']}",
    }


@router.get("/{project_id}/documents", response_model=list[DocumentOut])
def list_documents(project_id: str, db: Database = Depends(get_db)) -> list[dict]:
    if not get_project(db, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    rows = list(db.documents.find({"project_id": project_id}, {"_id": 0}).sort("created_at", -1))
    return [_doc_out(d) for d in rows]


@router.get("/{project_id}/documents/{doc_id}", response_model=DocumentOut)
def get_document(project_id: str, doc_id: str, db: Database = Depends(get_db)) -> dict:
    doc = db.documents.find_one({"id": doc_id, "project_id": project_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return _doc_out(doc)


@router.post(
    "/{project_id}/documents",
    response_model=DocumentOut,
    dependencies=[Depends(require_bot_token)],
)
def upload_document(project_id: str, body: DocumentCreateIn, db: Database = Depends(get_db)) -> dict:
    if not get_project(db, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    now = utcnow()
    doc = {
        "id": new_id(),
        "project_id": project_id,
        "kind": body.kind,
        "title": body.title,
        "markdown": body.markdown,
        "created_by_bot": body.bot or "orchestrator",
        "created_at": now,
    }
    db.documents.insert_one(doc)
    # Optionally point stage output at viewer
    kind_stage = {
        "requirements": "requirements",
        "design": "design",
        "test_report": "testing",
        "release_notes": "deployment",
    }
    stage = kind_stage.get(body.kind)
    if stage:
        db.stages.update_one(
            {"project_id": project_id, "name": stage},
            {
                "$set": {
                    "output_label": body.title,
                    "output_url": f"/projects/{project_id}/docs/{doc['id']}",
                }
            },
        )
    db.projects.update_one({"id": project_id}, {"$set": {"updated_at": now}})
    notify_orchestrator("document.uploaded", project_id, {"doc_id": doc["id"], "kind": body.kind})
    schedule_broadcast(project_id, {"type": "document.uploaded", "project_id": project_id, "doc_id": doc["id"]})
    return _doc_out(doc)
