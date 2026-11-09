from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Approval, Event, Project
from app.schemas.schemas import ApprovalDecision, ApprovalOut
from app.services.orchestrator import notify_orchestrator
from app.services.pipeline import (
    advance_after_design_approval,
    advance_after_release_approval,
    reject_design,
    reject_release,
    utcnow,
)
from app.services.ws_hub import schedule_broadcast

router = APIRouter(prefix="/api/approvals", tags=["approvals"])


def _to_out(a: Approval) -> ApprovalOut:
    return ApprovalOut(
        id=a.id,
        project_id=a.project_id,
        gate=a.gate,
        status=a.status,
        summary=a.summary,
        comment=a.comment,
        decided_by=a.decided_by,
        created_at=a.created_at,
        decided_at=a.decided_at,
        project_name=a.project.name if a.project else None,
        project_stage=a.project.current_stage if a.project else None,
    )


@router.get("", response_model=list[ApprovalOut])
def list_approvals(
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[ApprovalOut]:
    q = db.query(Approval).options(joinedload(Approval.project)).order_by(Approval.created_at.desc())
    if status:
        q = q.filter(Approval.status == status)
    return [_to_out(a) for a in q.all()]


@router.post("/{approval_id}", response_model=ApprovalOut)
def decide_approval(
    approval_id: str,
    body: ApprovalDecision,
    db: Session = Depends(get_db),
) -> ApprovalOut:
    approval = (
        db.query(Approval)
        .options(joinedload(Approval.project))
        .filter(Approval.id == approval_id)
        .one_or_none()
    )
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status != "pending":
        raise HTTPException(status_code=400, detail=f"Approval already {approval.status}")

    project = approval.project
    if not project:
        project = db.query(Project).filter(Project.id == approval.project_id).one()

    approval.status = body.decision
    approval.comment = body.comment
    approval.decided_by = body.decided_by
    approval.decided_at = utcnow()

    if body.decision == "approved":
        if approval.gate == "design":
            advance_after_design_approval(db, project)
        elif approval.gate == "release":
            advance_after_release_approval(db, project)
        action = f"Approved {approval.gate} gate"
        reason = body.comment or "Human approved"
    else:
        if approval.gate == "design":
            reject_design(db, project)
        elif approval.gate == "release":
            reject_release(db, project)
        action = f"Rejected {approval.gate} gate"
        reason = body.comment or "Human rejected"

    db.add(
        Event(
            id=str(uuid.uuid4()),
            project_id=project.id,
            bot="orchestrator",
            action=action,
            details=f"approval_id={approval.id}",
            reason=reason,
        )
    )
    db.commit()
    db.refresh(approval)

    notify_orchestrator(
        f"approval.{body.decision}",
        project.id,
        {"approval_id": approval.id, "gate": approval.gate, "comment": body.comment},
    )
    schedule_broadcast(
        project.id,
        {
            "type": f"approval.{body.decision}",
            "project_id": project.id,
            "approval_id": approval.id,
            "gate": approval.gate,
        },
    )
    # reload with project
    approval = (
        db.query(Approval)
        .options(joinedload(Approval.project))
        .filter(Approval.id == approval_id)
        .one()
    )
    return _to_out(approval)
