from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pymongo.database import Database

from app.database import get_db
from app.models import new_id, utcnow
from app.schemas.schemas import ProjectCreateJSON, ProjectDetail, ProjectSummary
from app.serialize import get_project, project_detail, project_summary
from app.services.orchestrator import notify_orchestrator
from app.services.pipeline import STAGE_ORDER, create_stages
from app.services.ws_hub import schedule_broadcast

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectSummary])
def list_projects(db: Database = Depends(get_db)) -> list[dict]:
    rows = list(db.projects.find({}, {"_id": 0}).sort("updated_at", -1))
    return [project_summary(p) for p in rows]


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project_route(project_id: str, db: Database = Depends(get_db)) -> dict:
    project = get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project_detail(db, project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, db: Database = Depends(get_db)) -> None:
    """Remove a project and related documents (for throwaway/test cleanup)."""
    project = get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    round_ids = [r["id"] for r in db.quiz_rounds.find({"project_id": project_id}, {"id": 1, "_id": 0})]
    if round_ids:
        db.quiz_questions.delete_many({"round_id": {"$in": round_ids}})
        db.quiz_answers.delete_many({"round_id": {"$in": round_ids}})
    for coll in ("quiz_rounds", "stages", "documents", "events", "approvals"):
        db[coll].delete_many({"project_id": project_id})
    db.projects.delete_one({"id": project_id})


def _insert_project(db: Database, project: dict, *, requirements_status: str) -> dict:
    now = utcnow()
    project.setdefault("created_at", now)
    project.setdefault("updated_at", now)
    project.setdefault("quiz_complete", False)
    db.projects.insert_one(project)
    create_stages(db, project["id"], requirements_status=requirements_status)
    db.events.insert_one(
        {
            "id": new_id(),
            "project_id": project["id"],
            "bot": "orchestrator",
            "action": "Project created",
            "details": f"type={project['type']}",
            "reason": "User started a new run",
            "created_at": now,
        }
    )
    return get_project(db, project["id"])  # type: ignore[return-value]


@router.post("", response_model=ProjectDetail, status_code=status.HTTP_201_CREATED)
async def create_project(
    db: Database = Depends(get_db),
    name: str | None = Form(default=None),
    description: str | None = Form(default=None),
    spec_file: UploadFile | None = File(default=None),
    repo_url: str | None = Form(default=None),
    change: str | None = Form(default=None),
    idea_text: str | None = Form(default=None),
) -> dict:
    spec_md: str | None = None
    project_type = "existing" if repo_url else ("idea" if idea_text else "new")
    req_status = "active"
    active_bot = "requirement_gatherer"
    current_stage = "requirements"

    if idea_text and idea_text.strip() and not repo_url and not (spec_file and spec_file.filename):
        project_type = "idea"
        description = idea_text.strip()
        if not name:
            first = description.splitlines()[0].strip()[:80]
            name = first if first else "Untitled Idea"
        spec_md = f"# {name}\n\n{description}\n"
        active_bot = "requirement_gatherer"
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
        req_status = "active"
    elif project_type != "idea":
        if not name:
            name = "Untitled Project"
        description = description or (change or "New project from uploaded spec")
        if not spec_md:
            spec_md = f"# {name}\n\n{description}\n"
        active_bot = "requirement_gatherer"
        req_status = "active"

    project_id = new_id()
    project = {
        "id": project_id,
        "name": name,
        "description": description or "",
        "type": project_type,
        "repo_url": repo_url,
        "spec_md": spec_md,
        "current_stage": current_stage,
        "status": "running",
        "active_bot": active_bot,
        "quiz_complete": False,
    }
    project = _insert_project(db, project, requirements_status=req_status)
    notify_orchestrator(
        "project.created",
        project_id,
        {"name": project["name"], "type": project["type"], "repo_url": project.get("repo_url")},
    )
    schedule_broadcast(project_id, {"type": "project.created", "project_id": project_id})
    return project_detail(db, project)


@router.post("/json", response_model=ProjectDetail, status_code=status.HTTP_201_CREATED)
def create_project_json(body: ProjectCreateJSON, db: Database = Depends(get_db)) -> dict:
    project_id = new_id()
    if body.idea_text or body.type == "idea":
        idea = (body.idea_text or body.description or body.change or "").strip()
        if not idea:
            raise HTTPException(status_code=400, detail="idea_text is required for idea projects")
        name = body.name or idea.splitlines()[0][:80] or "Untitled Idea"
        project = {
            "id": project_id,
            "name": name,
            "description": idea,
            "type": "idea",
            "repo_url": None,
            "spec_md": f"# {name}\n\n{idea}\n",
            "current_stage": "requirements",
            "status": "running",
            "active_bot": "requirement_gatherer",
            "quiz_complete": False,
        }
        project = _insert_project(db, project, requirements_status="clarifying")
    else:
        if not body.repo_url:
            raise HTTPException(status_code=400, detail="repo_url is required")
        name = body.name or (body.repo_url.rstrip("/").split("/")[-1] if body.repo_url else "Existing Project")
        project = {
            "id": project_id,
            "name": name,
            "description": body.change or body.description or "",
            "type": "existing",
            "repo_url": body.repo_url,
            "spec_md": None,
            "current_stage": "requirements",
            "status": "running",
            "active_bot": "maintainer",
            "quiz_complete": False,
        }
        project = _insert_project(db, project, requirements_status="active")
    notify_orchestrator("project.created", project_id, {"name": project["name"], "type": project["type"]})
    schedule_broadcast(project_id, {"type": "project.created", "project_id": project_id})
    return project_detail(db, project)


@router.get("/{project_id}/next-action")
def next_action(project_id: str, db: Database = Depends(get_db)) -> dict:
    project = get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    pending = db.approvals.find_one(
        {"project_id": project_id, "status": "pending"}, {"_id": 0}, sort=[("created_at", -1)]
    )
    if pending:
        return {
            "action": "wait_for_approval",
            "actor": "human",
            "gate": pending["gate"],
            "approval_id": pending["id"],
            "summary": pending.get("summary"),
            "project_status": project.get("status"),
            "current_stage": project.get("current_stage"),
            "active_bot": project.get("active_bot"),
        }

    quiz = db.quiz_rounds.find_one(
        {"project_id": project_id}, {"_id": 0}, sort=[("round_number", -1)]
    )
    if quiz and quiz.get("status") == "open":
        return {
            "action": "answer_quiz",
            "actor": "human",
            "quiz_round_id": quiz["id"],
            "round_number": quiz.get("round_number"),
            "project_status": project.get("status"),
            "current_stage": project.get("current_stage"),
            "active_bot": project.get("active_bot"),
        }
    if quiz and quiz.get("status") == "answered" and not project.get("quiz_complete"):
        answers = []
        for a in db.quiz_answers.find({"round_id": quiz["id"]}, {"_id": 0}):
            import json as _json
            try:
                val = _json.loads(a["value_json"])
            except Exception:
                val = a.get("value_json")
            answers.append({"question_id": a["question_id"], "value": val})
        return {
            "action": "quiz_answered",
            "actor": "bot",
            "bot": "requirement_gatherer",
            "quiz_round_id": quiz["id"],
            "answers": answers,
            "quiz": {"id": quiz["id"], "answers": answers, "status": quiz.get("status")},
            "project_status": project.get("status"),
            "current_stage": project.get("current_stage"),
            "active_bot": project.get("active_bot"),
        }

    if project.get("status") == "done":
        return {
            "action": "complete",
            "actor": "none",
            "project_status": "done",
            "current_stage": project.get("current_stage"),
            "active_bot": project.get("active_bot"),
        }

    latest = db.approvals.find_one(
        {"project_id": project_id, "status": {"$in": ["approved", "rejected"]}},
        {"_id": 0},
        sort=[("decided_at", -1)],
    )
    stage_name = project.get("current_stage") or "requirements"
    stage = db.stages.find_one({"project_id": project_id, "name": stage_name}, {"_id": 0})
    out = {
        "action": "continue",
        "actor": "bot",
        "bot": project.get("active_bot") or (stage or {}).get("bot"),
        "stage": stage_name,
        "stage_status": (stage or {}).get("status"),
        "project_status": project.get("status"),
        "current_stage": stage_name,
        "active_bot": project.get("active_bot"),
        "stages": STAGE_ORDER,
    }
    if latest:
        out["latest_decision"] = latest
    return out
