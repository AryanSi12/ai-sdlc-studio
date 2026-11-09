from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_bot_token
from app.database import get_db
from app.models import Document, Event, Project
from app.models.models import utcnow
from app.schemas.quiz_docs import DocumentCreateIn, DocumentOut
from app.services.orchestrator import notify_orchestrator
from app.services.pipeline import STAGE_ORDER
from app.services.ws_hub import schedule_broadcast

router = APIRouter(prefix="/api/projects", tags=["documents"])

KIND_STAGE = {
    "requirements": "requirements",
    "design": "design",
    "test_report": "testing",
    "release_notes": "deployment",
    "codebase_summary": None,
}


def _out(doc: Document) -> DocumentOut:
    return DocumentOut(
        id=doc.id,
        project_id=doc.project_id,
        kind=doc.kind,
        title=doc.title,
        markdown=doc.markdown,
        created_by_bot=doc.created_by_bot,
        created_at=doc.created_at,
        viewer_path=f"/projects/{doc.project_id}/docs/{doc.id}",
    )


@router.post("/{project_id}/documents", response_model=DocumentOut, dependencies=[Depends(require_bot_token)])
def upload_document(project_id: str, body: DocumentCreateIn, db: Session = Depends(get_db)) -> DocumentOut:
    project = db.query(Project).filter(Project.id == project_id).one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    doc = Document(
        id=str(uuid.uuid4()),
        project_id=project_id,
        kind=body.kind,
        title=body.title,
        markdown=body.markdown,
        created_by_bot=body.bot,
    )
    db.add(doc)

    stage_name = KIND_STAGE.get(body.kind) if body.link_to_stage else None
    if stage_name:
        for st in project.stages:
            if st.name == stage_name:
                st.output_label = body.title
                st.output_url = f"/projects/{project_id}/docs/{doc.id}"
                if st.status in ("clarifying", "active", "pending"):
                    if body.kind == "requirements":
                        st.status = "done"
                        st.ended_at = utcnow()
                break

    project.updated_at = utcnow()
    db.add(
        Event(
            id=str(uuid.uuid4()),
            project_id=project_id,
            bot=body.bot,
            action=f"document.uploaded.{body.kind}",
            details=body.title,
            reason=f"Document stored in Studio ({body.kind})",
        )
    )
    db.commit()
    db.refresh(doc)
    notify_orchestrator("document.uploaded", project_id, {"document_id": doc.id, "kind": doc.kind})
    schedule_broadcast(project_id, {"type": "document.uploaded", "project_id": project_id, "document_id": doc.id})
    return _out(doc)


@router.get("/{project_id}/documents", response_model=list[DocumentOut])
def list_documents(project_id: str, db: Session = Depends(get_db)) -> list[DocumentOut]:
    project = db.query(Project).filter(Project.id == project_id).one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    docs = (
        db.query(Document)
        .filter(Document.project_id == project_id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return [_out(d) for d in docs]


@router.get("/{project_id}/documents/{doc_id}", response_model=DocumentOut)
def get_document(project_id: str, doc_id: str, db: Session = Depends(get_db)) -> DocumentOut:
    doc = (
        db.query(Document)
        .filter(Document.id == doc_id, Document.project_id == project_id)
        .one_or_none()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return _out(doc)
