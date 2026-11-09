from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Event, Project, QuizRound, Stage
from app.schemas.schemas import ProjectCreateJSON, ProjectDetail, ProjectSummary
from app.services.orchestrator import notify_orchestrator
from app.services.pipeline import STAGE_BOT, STAGE_ORDER, utcnow
from app.services.ws_hub import schedule_broadcast

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _new_id() -> str:
    return str(uuid.uuid4())


def _create_stages(db: Session, project_id: str, *, requirements_status: str = "active") -> None:
    for idx, name in enumerate(STAGE_ORDER):
        status = requirements_status if idx == 0 else "pending"
        db.add(
            Stage(
                id=_new_id(),
                project_id=project_id,
                name=name,
                status=status,
                bot=STAGE_BOT[name],
                started_at=utcnow() if idx == 0 else None,
            )
        )


def _to_detail(project: Project) -> ProjectDetail:
    events = sorted(project.events, key=lambda e: e.created_at, reverse=True)[:50]
    approvals = sorted(project.approvals, key=lambda a: a.created_at, reverse=True)
    stages = sorted(project.stages, key=lambda s: STAGE_ORDER.index(s.name) if s.name in STAGE_ORDER else 99)
    return ProjectDetail(
        id=project.id,
        name=project.name,
        description=project.description,
        type=project.type,
        repo_url=project.repo_url,
        spec_md=project.spec_md,
        current_stage=project.current_stage,
        status=project.status,
        active_bot=project.active_bot,
        quiz_complete=bool(getattr(project, "quiz_complete", False)),
        created_at=project.created_at,
        updated_at=project.updated_at,
        stages=stages,
        approvals=[
            {
                "id": a.id,
                "project_id": a.project_id,
                "gate": a.gate,
                "status": a.status,
                "summary": a.summary,
                "comment": a.comment,
                "decided_by": a.decided_by,
                "created_at": a.created_at,
                "decided_at": a.decided_at,
                "project_name": project.name,
                "project_stage": project.current_stage,
            }
            for a in approvals
        ],
        events=[
            {
                "id": e.id,
                "project_id": e.project_id,
                "bot": e.bot,
                "action": e.action,
                "details": e.details,
                "reason": e.reason,
                "created_at": e.created_at,
                "project_name": project.name,
            }
            for e in events
        ],
    )


@router.get("", response_model=list[ProjectSummary])
def list_projects(db: Session = Depends(get_db)) -> list[Project]:
    return db.query(Project).order_by(Project.updated_at.desc()).all()


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(project_id: str, db: Session = Depends(get_db)) -> ProjectDetail:
    project = (
        db.query(Project)
        .options(joinedload(Project.stages), joinedload(Project.approvals), joinedload(Project.events))
        .filter(Project.id == project_id)
        .one_or_none()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return _to_detail(project)


@router.post("", response_model=ProjectDetail, status_code=status.HTTP_201_CREATED)
async def create_project(
    db: Session = Depends(get_db),
    # multipart new-project path
    name: str | None = Form(default=None),
    description: str | None = Form(default=None),
    spec_file: UploadFile | None = File(default=None),
    # existing-project path (also accepted as form fields)
    repo_url: str | None = Form(default=None),
    change: str | None = Form(default=None),
    idea_text: str | None = Form(default=None),
) -> ProjectDetail:
    """Create from idea text, .md upload, or existing repo URL."""
    spec_md: str | None = None
    project_type = "existing" if repo_url else ("idea" if idea_text else "new")
    req_status = "active"

    if idea_text and idea_text.strip() and not repo_url and not (spec_file and spec_file.filename):
        project_type = "idea"
        description = idea_text.strip()
        if not name:
            # first line or short slug
            first = description.splitlines()[0].strip()[:80]
            name = first if first else "Untitled Idea"
        spec_md = f"# {name}\n\n{description}\n"
        active_bot = "requirement_gatherer"
        current_stage = "requirements"
        req_status = "clarifying"
    elif spec_file is not None and spec_file.filename:
        content = await spec_file.read()
        try:
            spec_md = content.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise HTTPException(status_code=400, detail="Spec file must be UTF-8 text") from exc
        project_type = "new"
        if not name:
            stem = Path(spec_file.filename).stem.replace("-", " ").replace("_", " ").title()
            name = stem or "Untitled Project"

    if project_type == "existing":
        if not repo_url:
            raise HTTPException(status_code=400, detail="repo_url is required for existing projects")
        if not name:
            name = repo_url.rstrip("/").split("/")[-1] or "Existing Project"
        description = change or description or f"Change request for {repo_url}"
        active_bot = "maintainer"
        current_stage = "requirements"
        req_status = "active"
    elif project_type == "idea":
        pass  # already set above
    else:
        if not name:
            name = "Untitled Project"
        description = description or (change or "New project from uploaded spec")
        if not spec_md:
            spec_md = f"# {name}\n\n{description}\n"
        active_bot = "requirement_gatherer"
        current_stage = "requirements"
        req_status = "active"

    project_id = _new_id()
    project = Project(
        id=project_id,
        name=name,
        description=description or "",
        type=project_type,
        repo_url=repo_url,
        spec_md=spec_md,
        current_stage=current_stage,
        status="running",
        active_bot=active_bot,
        quiz_complete=False,
    )
    db.add(project)
    _create_stages(db, project_id, requirements_status=req_status)
    db.add(
        Event(
            id=_new_id(),
            project_id=project_id,
            bot="orchestrator",
            action="Project created",
            details=f"type={project_type}",
            reason="User started a new run",
        )
    )
    db.commit()

    project = (
        db.query(Project)
        .options(joinedload(Project.stages), joinedload(Project.approvals), joinedload(Project.events))
        .filter(Project.id == project_id)
        .one()
    )
    notify_orchestrator(
        "project.created",
        project_id,
        {"name": project.name, "type": project.type, "repo_url": project.repo_url},
    )
    schedule_broadcast(project_id, {"type": "project.created", "project_id": project_id})
    return _to_detail(project)


@router.post("/json", response_model=ProjectDetail, status_code=status.HTTP_201_CREATED)
def create_project_json(body: ProjectCreateJSON, db: Session = Depends(get_db)) -> ProjectDetail:
    """JSON convenience endpoint for existing-repo or idea runs."""
    project_id = _new_id()
    if body.idea_text or body.type == "idea":
        idea = (body.idea_text or body.description or body.change or "").strip()
        if not idea:
            raise HTTPException(status_code=400, detail="idea_text is required for idea projects")
        name = body.name or idea.splitlines()[0][:80] or "Untitled Idea"
        project = Project(
            id=project_id,
            name=name,
            description=idea,
            type="idea",
            repo_url=None,
            spec_md=f"# {name}\n\n{idea}\n",
            current_stage="requirements",
            status="running",
            active_bot="requirement_gatherer",
            quiz_complete=False,
        )
        db.add(project)
        _create_stages(db, project_id, requirements_status="clarifying")
    else:
        if not body.repo_url:
            raise HTTPException(status_code=400, detail="repo_url is required")
        name = body.name or (body.repo_url.rstrip("/").split("/")[-1] if body.repo_url else "Existing Project")
        project = Project(
            id=project_id,
            name=name,
            description=body.change or body.description or "",
            type="existing",
            repo_url=body.repo_url,
            spec_md=None,
            current_stage="requirements",
            status="running",
            active_bot="maintainer",
            quiz_complete=False,
        )
        db.add(project)
        _create_stages(db, project_id)
    db.add(
        Event(
            id=_new_id(),
            project_id=project_id,
            bot="orchestrator",
            action="Project created",
            details="type=existing",
            reason="User started a new run",
        )
    )
    db.commit()
    project = (
        db.query(Project)
        .options(joinedload(Project.stages), joinedload(Project.approvals), joinedload(Project.events))
        .filter(Project.id == project_id)
        .one()
    )
    notify_orchestrator("project.created", project_id, {"name": project.name, "type": project.type})
    schedule_broadcast(project_id, {"type": "project.created", "project_id": project_id})
    return _to_detail(project)


@router.get("/{project_id}/next-action")
def next_action(project_id: str, db: Session = Depends(get_db)) -> dict:
    """Orchestrator poll endpoint: what should happen next given gates + stage."""
    project = (
        db.query(Project)
        .options(joinedload(Project.stages), joinedload(Project.approvals), joinedload(Project.events))
        .filter(Project.id == project_id)
        .one_or_none()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    pending = [a for a in project.approvals if a.status == "pending"]
    latest_decided = sorted(
        [a for a in project.approvals if a.status in ("approved", "rejected")],
        key=lambda a: a.decided_at or a.created_at,
        reverse=True,
    )
    latest = latest_decided[0] if latest_decided else None

    open_quiz = (
        db.query(QuizRound)
        .filter(QuizRound.project_id == project_id, QuizRound.status == "open")
        .order_by(QuizRound.round_number.desc())
        .first()
    )
    latest_answered_quiz = (
        db.query(QuizRound)
        .filter(QuizRound.project_id == project_id, QuizRound.status == "answered")
        .order_by(QuizRound.round_number.desc())
        .first()
    )

    action = "continue"
    detail = f"Stage {project.current_stage} is {project.status}"
    quiz_payload = None

    if open_quiz:
        action = "answer_quiz"
        detail = f"User must answer quiz round {open_quiz.round_number}"
        quiz_payload = {"round_id": open_quiz.id, "round_number": open_quiz.round_number, "status": "open"}
    elif (
        latest_answered_quiz
        and not getattr(project, "quiz_complete", False)
        and project.type == "idea"
        and project.current_stage == "requirements"
    ):
        from app.api.quiz import _round_out
        from sqlalchemy.orm import joinedload as _jl

        rnd = (
            db.query(QuizRound)
            .options(_jl(QuizRound.questions), _jl(QuizRound.answers))
            .filter(QuizRound.id == latest_answered_quiz.id)
            .one()
        )
        action = "quiz_answered"
        detail = f"Quiz round {rnd.round_number} answered — write or follow up"
        quiz_payload = _round_out(rnd, project.name).model_dump(mode="json")
    elif pending:
        action = "wait_for_approval"
        detail = f"Pending {pending[0].gate} gate ({pending[0].id})"
    elif project.status == "waiting_approval":
        action = "wait_for_approval"
        detail = "Project marked waiting_approval"
    elif project.status == "failed":
        action = "fix_failed_stage"
        detail = f"Stage {project.current_stage} failed — loop back to developer/designer"
    elif project.status == "done":
        action = "done"
        detail = "Pipeline complete"
    elif project.current_stage == "design" and any(
        a.gate == "design" and a.status == "approved" for a in project.approvals
    ):
        action = "start_development"
        detail = "Design approved — developer may proceed"
    elif project.current_stage == "deployment" and any(
        a.gate == "release" and a.status == "approved" for a in project.approvals
    ):
        action = "deploy"
        detail = "Release approved — deployer may ship"
    elif latest and latest.status == "rejected":
        action = "handle_rejection"
        detail = f"{latest.gate} gate rejected: {latest.comment or ''}".strip()

    return {
        "project_id": project.id,
        "status": project.status,
        "current_stage": project.current_stage,
        "active_bot": project.active_bot,
        "action": action,
        "detail": detail,
        "pending_approvals": [
            {
                "id": a.id,
                "gate": a.gate,
                "summary": a.summary,
                "created_at": a.created_at,
            }
            for a in pending
        ],
        "latest_decision": (
            {
                "id": latest.id,
                "gate": latest.gate,
                "status": latest.status,
                "comment": latest.comment,
                "decided_by": latest.decided_by,
                "decided_at": latest.decided_at,
            }
            if latest
            else None
        ),
        "quiz": quiz_payload,
        "quiz_complete": bool(getattr(project, "quiz_complete", False)),
    }
