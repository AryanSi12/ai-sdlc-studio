from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo.database import Database

from app.database import get_db
from app.models import utcnow
from app.schemas.schemas import ApprovalDecision, ApprovalOut
from app.serialize import get_project
from app.services.orchestrator import notify_orchestrator
from app.services.pipeline import STAGE_ORDER, mark_stage, next_stage_name
from app.services.ws_hub import schedule_broadcast

router = APIRouter(prefix="/api/approvals", tags=["approvals"])


@router.get("", response_model=list[ApprovalOut])
def list_approvals(status: str | None = Query(default=None), db: Database = Depends(get_db)) -> list[dict]:
    q: dict = {}
    if status:
        q["status"] = status
    rows = list(db.approvals.find(q, {"_id": 0}).sort("created_at", -1).limit(100))
    projects = {p["id"]: p for p in db.projects.find({}, {"_id": 0, "id": 1, "name": 1, "current_stage": 1})}
    for a in rows:
        p = projects.get(a["project_id"]) or {}
        a["project_name"] = p.get("name")
        a["project_stage"] = p.get("current_stage")
    return rows


@router.post("/{approval_id}", response_model=ApprovalOut)
def decide(approval_id: str, body: ApprovalDecision, db: Database = Depends(get_db)) -> dict:
    approval = db.approvals.find_one({"id": approval_id}, {"_id": 0})
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Approval already decided")
    project = get_project(db, approval["project_id"])
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    now = utcnow()
    db.approvals.update_one(
        {"id": approval_id},
        {
            "$set": {
                "status": body.decision,
                "comment": body.comment,
                "decided_by": body.decided_by,
                "decided_at": now,
            }
        },
    )
    updates: dict = {"updated_at": now, "status": "running"}
    if body.decision == "approved":
        # advance past the gate stage
        gate_stage = "design" if approval["gate"] == "design" else "deployment"
        mark_stage(db, project["id"], gate_stage, "done")
        nxt = next_stage_name(gate_stage)
        if nxt:
            mark_stage(db, project["id"], nxt, "active")
            updates["current_stage"] = nxt
            # map next bot
            from app.services.pipeline import STAGE_BOT

            updates["active_bot"] = STAGE_BOT.get(nxt, "orchestrator")
        else:
            updates["status"] = "done"
            updates["active_bot"] = "orchestrator"
    else:
        # Send back to the gate stage for revision
        gate_stage = "design" if approval["gate"] == "design" else "deployment"
        mark_stage(db, project["id"], gate_stage, "active")
        updates["current_stage"] = gate_stage
        from app.services.pipeline import STAGE_BOT
        updates["active_bot"] = STAGE_BOT.get(gate_stage, "orchestrator")
        updates["status"] = "running"

    db.projects.update_one({"id": project["id"]}, {"$set": updates})
    approval = db.approvals.find_one({"id": approval_id}, {"_id": 0})
    approval["project_name"] = project["name"]
    approval["project_stage"] = updates.get("current_stage", project.get("current_stage"))
    notify_orchestrator(
        "approval.decided",
        project["id"],
        {"approval_id": approval_id, "decision": body.decision},
    )
    schedule_broadcast(
        project["id"],
        {"type": "approval.decided", "project_id": project["id"], "approval_id": approval_id},
    )
    return approval
