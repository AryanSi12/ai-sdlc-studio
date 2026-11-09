from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Event, Project
from app.schemas.schemas import FindingOut, MaintainerView, SuggestionOut

router = APIRouter(prefix="/api/maintainer", tags=["maintainer"])


@router.get("/{project_id}", response_model=MaintainerView)
def get_maintainer_view(project_id: str, db: Session = Depends(get_db)) -> MaintainerView:
    project = db.query(Project).filter(Project.id == project_id).one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    findings = (
        db.query(Event)
        .filter(Event.project_id == project_id, Event.action == "finding")
        .order_by(Event.created_at.desc())
        .all()
    )
    suggestions = (
        db.query(Event)
        .filter(Event.project_id == project_id, Event.action == "suggestion")
        .order_by(Event.created_at.desc())
        .all()
    )

    issues: list[FindingOut] = []
    for f in findings:
        try:
            data = json.loads(f.details or "{}")
        except json.JSONDecodeError:
            data = {"severity": "medium", "title": f.reason or "Finding", "detail": f.details or ""}
        issues.append(
            FindingOut(
                id=f.id,
                severity=data.get("severity", "medium"),
                title=data.get("title", f.reason or "Finding"),
                detail=data.get("detail", f.details or ""),
            )
        )

    suggs: list[SuggestionOut] = []
    for s in suggestions:
        try:
            data = json.loads(s.details or "{}")
        except json.JSONDecodeError:
            data = {
                "title": s.reason or "Suggestion",
                "impact": "Maintainability",
                "estimate": "1 day",
                "description": s.details or "",
            }
        suggs.append(
            SuggestionOut(
                id=s.id,
                title=data.get("title", s.reason or "Suggestion"),
                impact=data.get("impact", "Maintainability"),
                estimate=data.get("estimate", "1 day"),
                description=data.get("description", s.details or ""),
            )
        )

    health_event = (
        db.query(Event)
        .filter(Event.project_id == project_id, Event.action == "health")
        .order_by(Event.created_at.desc())
        .first()
    )
    health = {
        "score": 70,
        "label": "Fair",
        "lastScan": project.updated_at.isoformat() if project.updated_at else None,
        "branch": "main",
        "openPrs": 0,
        "openIssues": len(issues),
        "coverage": "n/a",
        "outdatedDeps": 0,
    }
    if health_event and health_event.details:
        try:
            health.update(json.loads(health_event.details))
        except json.JSONDecodeError:
            pass

    summary = (
        health_event.reason
        if health_event and health_event.reason
        else project.description or "No maintainer summary yet."
    )

    return MaintainerView(
        project_id=project.id,
        repo=project.repo_url,
        health=health,
        summary=summary,
        issues=issues,
        suggestions=suggs,
    )
