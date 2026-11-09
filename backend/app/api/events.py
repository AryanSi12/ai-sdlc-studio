from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_bot_token
from app.database import get_db
from app.models import Approval, Event, Project
from app.schemas.schemas import EventCreate, EventOut
from app.services.orchestrator import notify_orchestrator
from app.services.pipeline import STAGE_ORDER, mark_stage, utcnow
from app.services.ws_hub import schedule_broadcast

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=list[EventOut])
def list_events(
    project_id: str | None = Query(default=None),
    bot: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[EventOut]:
    q = db.query(Event).options(joinedload(Event.project)).order_by(Event.created_at.desc())
    if project_id:
        q = q.filter(Event.project_id == project_id)
    if bot:
        q = q.filter(Event.bot == bot)
    rows = q.limit(200).all()
    return [
        EventOut(
            id=e.id,
            project_id=e.project_id,
            bot=e.bot,
            action=e.action,
            details=e.details,
            reason=e.reason,
            created_at=e.created_at,
            project_name=e.project.name if e.project else None,
        )
        for e in rows
    ]


@router.post("", response_model=EventOut, status_code=201, dependencies=[Depends(require_bot_token)])
def post_event(body: EventCreate, db: Session = Depends(get_db)) -> EventOut:
    project = db.query(Project).filter(Project.id == body.project_id).one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    event = Event(
        id=str(uuid.uuid4()),
        project_id=body.project_id,
        bot=body.bot,
        action=body.action,
        details=body.details,
        reason=body.reason,
    )
    db.add(event)

    if body.stage_name:
        if body.stage_name not in STAGE_ORDER:
            raise HTTPException(status_code=400, detail=f"Invalid stage_name: {body.stage_name}")
        stage = mark_stage(db, project.id, body.stage_name, body.stage_status or "active")
        if stage and body.output_label is not None:
            stage.output_label = body.output_label
        if stage and body.output_url is not None:
            stage.output_url = body.output_url
        if body.stage_status == "active":
            project.current_stage = body.stage_name
        # when a stage completes, activate the next if no approval requested
        if body.stage_status == "done" and not body.request_approval:
            idx = STAGE_ORDER.index(body.stage_name)
            if idx + 1 < len(STAGE_ORDER):
                nxt = STAGE_ORDER[idx + 1]
                mark_stage(db, project.id, nxt, "active")
                project.current_stage = nxt

    if body.project_status:
        project.status = body.project_status
    if body.active_bot:
        project.active_bot = body.active_bot
    elif body.bot:
        project.active_bot = body.bot

    if body.request_approval:
        approval = Approval(
            id=str(uuid.uuid4()),
            project_id=project.id,
            gate=body.request_approval,
            status="pending",
            summary=body.approval_summary or body.details or body.action,
        )
        db.add(approval)
        project.status = "waiting_approval"
        notify_orchestrator(
            "approval.requested",
            project.id,
            {"gate": body.request_approval, "approval_id": approval.id},
        )

    project.updated_at = utcnow()
    db.commit()
    db.refresh(event)

    notify_orchestrator(
        "event.posted",
        project.id,
        {"bot": body.bot, "action": body.action, "event_id": event.id},
    )
    schedule_broadcast(
        project.id,
        {"type": "event.posted", "project_id": project.id, "event_id": event.id, "bot": body.bot},
    )

    return EventOut(
        id=event.id,
        project_id=event.project_id,
        bot=event.bot,
        action=event.action,
        details=event.details,
        reason=event.reason,
        created_at=event.created_at,
        project_name=project.name,
    )
