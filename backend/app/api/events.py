from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo.database import Database

from app.api.deps import require_bot_token
from app.database import get_db
from app.models import new_id, utcnow
from app.schemas.schemas import EventCreate, EventOut
from app.serialize import get_project
from app.services.orchestrator import notify_orchestrator
from app.services.pipeline import STAGE_ORDER, mark_stage
from app.services.ws_hub import schedule_broadcast

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=list[EventOut])
def list_events(
    project_id: str | None = Query(default=None),
    bot: str | None = Query(default=None),
    db: Database = Depends(get_db),
) -> list[dict]:
    q: dict = {}
    if project_id:
        q["project_id"] = project_id
    if bot:
        q["bot"] = bot
    rows = list(db.events.find(q, {"_id": 0}).sort("created_at", -1).limit(200))
    # attach project names
    names = {p["id"]: p["name"] for p in db.projects.find({}, {"_id": 0, "id": 1, "name": 1})}
    for e in rows:
        e["project_name"] = names.get(e["project_id"])
    return rows


@router.post("", response_model=EventOut, status_code=201, dependencies=[Depends(require_bot_token)])
def post_event(body: EventCreate, db: Database = Depends(get_db)) -> dict:
    project = get_project(db, body.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    now = utcnow()
    event = {
        "id": new_id(),
        "project_id": body.project_id,
        "bot": body.bot,
        "action": body.action,
        "details": body.details,
        "reason": body.reason,
        "created_at": now,
    }
    db.events.insert_one(event)

    updates: dict = {"updated_at": now}

    if body.stage_name:
        if body.stage_name not in STAGE_ORDER:
            raise HTTPException(status_code=400, detail=f"Invalid stage_name: {body.stage_name}")
        stage = mark_stage(db, project["id"], body.stage_name, body.stage_status or "active")
        if stage and body.output_label is not None:
            db.stages.update_one(
                {"project_id": project["id"], "name": body.stage_name},
                {"$set": {"output_label": body.output_label}},
            )
        if stage and body.output_url is not None:
            db.stages.update_one(
                {"project_id": project["id"], "name": body.stage_name},
                {"$set": {"output_url": body.output_url}},
            )
        if body.stage_status == "active":
            updates["current_stage"] = body.stage_name
        if body.stage_status == "done" and not body.request_approval:
            idx = STAGE_ORDER.index(body.stage_name)
            if idx + 1 < len(STAGE_ORDER):
                nxt = STAGE_ORDER[idx + 1]
                mark_stage(db, project["id"], nxt, "active")
                updates["current_stage"] = nxt

    if body.project_status:
        updates["status"] = body.project_status
    if body.active_bot:
        updates["active_bot"] = body.active_bot
    elif body.bot:
        updates["active_bot"] = body.bot

    if body.request_approval:
        approval = {
            "id": new_id(),
            "project_id": project["id"],
            "gate": body.request_approval,
            "status": "pending",
            "summary": body.approval_summary or body.details or body.action,
            "comment": None,
            "decided_by": None,
            "created_at": now,
            "decided_at": None,
        }
        db.approvals.insert_one(approval)
        updates["status"] = "waiting_approval"
        notify_orchestrator(
            "approval.requested",
            project["id"],
            {"gate": body.request_approval, "approval_id": approval["id"]},
        )

    db.projects.update_one({"id": project["id"]}, {"$set": updates})

    notify_orchestrator(
        "event.posted",
        project["id"],
        {"bot": body.bot, "action": body.action, "event_id": event["id"]},
    )
    schedule_broadcast(
        project["id"],
        {"type": "event.posted", "project_id": project["id"], "event_id": event["id"], "bot": body.bot},
    )
    event["project_name"] = project["name"]
    return event
