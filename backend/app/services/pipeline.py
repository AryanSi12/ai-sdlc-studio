"""Stage progression helpers for the SDLC pipeline."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Project, Stage

STAGE_ORDER = ["requirements", "design", "development", "testing", "deployment"]

STAGE_BOT = {
    "requirements": "requirement_gatherer",
    "design": "designer",
    "development": "developer",
    "testing": "tester",
    "deployment": "deployer",
}

STAGE_LABEL = {
    "requirements": "Requirements",
    "design": "Design",
    "development": "Development",
    "testing": "Testing",
    "deployment": "Deployment",
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def next_stage_name(current: str) -> str | None:
    try:
        idx = STAGE_ORDER.index(current)
    except ValueError:
        return None
    if idx + 1 >= len(STAGE_ORDER):
        return None
    return STAGE_ORDER[idx + 1]


def get_stage(db: Session, project_id: str, name: str) -> Stage | None:
    return (
        db.query(Stage)
        .filter(Stage.project_id == project_id, Stage.name == name)
        .one_or_none()
    )


def mark_stage(db: Session, project_id: str, name: str, status: str) -> Stage | None:
    stage = get_stage(db, project_id, name)
    if not stage:
        return None
    stage.status = status
    now = utcnow()
    if status == "active" and not stage.started_at:
        stage.started_at = now
    if status in ("done", "failed"):
        stage.ended_at = now
    return stage


def advance_after_design_approval(db: Session, project: Project) -> None:
    mark_stage(db, project.id, "design", "done")
    mark_stage(db, project.id, "development", "active")
    project.current_stage = "development"
    project.status = "running"
    project.active_bot = "developer"
    project.updated_at = utcnow()


def advance_after_release_approval(db: Session, project: Project) -> None:
    mark_stage(db, project.id, "deployment", "done")
    project.current_stage = "deployment"
    project.status = "done"
    project.active_bot = "deployer"
    project.updated_at = utcnow()


def reject_design(db: Session, project: Project) -> None:
    mark_stage(db, project.id, "design", "active")
    project.current_stage = "design"
    project.status = "running"
    project.active_bot = "designer"
    project.updated_at = utcnow()


def reject_release(db: Session, project: Project) -> None:
    mark_stage(db, project.id, "deployment", "pending")
    mark_stage(db, project.id, "testing", "active")
    project.current_stage = "testing"
    project.status = "running"
    project.active_bot = "tester"
    project.updated_at = utcnow()
