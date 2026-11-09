from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.api.deps import require_bot_token
from app.database import get_db
from app.models import new_id, utcnow
from app.schemas.quiz_docs import (
    QuizAnswersIn,
    QuizCreateIn,
    QuizQuestionOut,
    QuizRoundOut,
)
from app.serialize import get_project
from app.services.orchestrator import notify_orchestrator
from app.services.ws_hub import schedule_broadcast

router = APIRouter(prefix="/api/projects", tags=["quiz"])


def _round_out(db: Database, rnd: dict) -> dict:
    questions = list(
        db.quiz_questions.find({"round_id": rnd["id"]}, {"_id": 0}).sort("sort_order", 1)
    )
    answers = list(db.quiz_answers.find({"round_id": rnd["id"]}, {"_id": 0}))
    q_out = []
    for q in questions:
        opts = None
        if q.get("options_json"):
            try:
                opts = json.loads(q["options_json"])
            except json.JSONDecodeError:
                opts = None
        q_out.append(
            {
                "id": q["id"],
                "text": q["text"],
                "kind": q["kind"],
                "options": opts,
                "required": bool(q.get("required", True)),
                "help": q.get("help"),
                "sort_order": q.get("sort_order", 0),
            }
        )
    a_out = []
    for a in answers:
        try:
            val = json.loads(a["value_json"])
        except Exception:
            val = a.get("value_json")
        a_out.append({"question_id": a["question_id"], "value": val})
    return {
        "id": rnd["id"],
        "project_id": rnd["project_id"],
        "round_number": rnd["round_number"],
        "status": rnd["status"],
        "created_at": rnd["created_at"],
        "answered_at": rnd.get("answered_at"),
        "questions": q_out,
        "answers": a_out,
    }


@router.post("/{project_id}/quiz", response_model=QuizRoundOut, dependencies=[Depends(require_bot_token)])
def create_quiz(project_id: str, body: QuizCreateIn, db: Database = Depends(get_db)) -> dict:
    project = get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    last = db.quiz_rounds.find_one({"project_id": project_id}, sort=[("round_number", -1)])
    n = (last["round_number"] + 1) if last else 1
    now = utcnow()
    rid = new_id()
    db.quiz_rounds.insert_one(
        {
            "id": rid,
            "project_id": project_id,
            "round_number": n,
            "status": "open",
            "created_at": now,
            "answered_at": None,
        }
    )
    for i, q in enumerate(body.questions):
        db.quiz_questions.insert_one(
            {
                "id": new_id(),
                "round_id": rid,
                "text": q.text,
                "kind": q.kind,
                "options_json": json.dumps(q.options) if q.options is not None else None,
                "required": q.required,
                "help": q.help,
                "sort_order": i,
            }
        )
    db.stages.update_one(
        {"project_id": project_id, "name": "requirements"},
        {"$set": {"status": "clarifying"}},
    )
    db.projects.update_one(
        {"id": project_id},
        {"$set": {"active_bot": "requirement_gatherer", "updated_at": now, "quiz_complete": False}},
    )
    rnd = db.quiz_rounds.find_one({"id": rid}, {"_id": 0})
    notify_orchestrator("quiz.created", project_id, {"round_id": rid, "round_number": n})
    schedule_broadcast(project_id, {"type": "quiz.created", "project_id": project_id, "round_id": rid})
    return _round_out(db, rnd)


@router.get("/{project_id}/quiz/latest", response_model=QuizRoundOut | None)
def latest_quiz(project_id: str, db: Database = Depends(get_db)) -> dict | None:
    if not get_project(db, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    rnd = db.quiz_rounds.find_one({"project_id": project_id}, {"_id": 0}, sort=[("round_number", -1)])
    if not rnd:
        return None
    return _round_out(db, rnd)


@router.post("/{project_id}/quiz/{round_id}/answers", response_model=QuizRoundOut)
def submit_answers(
    project_id: str, round_id: str, body: QuizAnswersIn, db: Database = Depends(get_db)
) -> dict:
    project = get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    rnd = db.quiz_rounds.find_one({"id": round_id, "project_id": project_id}, {"_id": 0})
    if not rnd:
        raise HTTPException(status_code=404, detail="Quiz round not found")
    if rnd.get("status") != "open":
        raise HTTPException(status_code=400, detail="Quiz round is not open")
    questions = {q["id"]: q for q in db.quiz_questions.find({"round_id": round_id}, {"_id": 0})}
    for raw in body.answers:
        qid = raw.get("question_id") if isinstance(raw, dict) else getattr(raw, "question_id", None)
        val = raw.get("value") if isinstance(raw, dict) else getattr(raw, "value", None)
        if qid not in questions:
            raise HTTPException(status_code=400, detail=f"Unknown question {qid}")
        db.quiz_answers.delete_many({"round_id": round_id, "question_id": qid})
        db.quiz_answers.insert_one(
            {
                "id": new_id(),
                "round_id": round_id,
                "question_id": qid,
                "value_json": json.dumps(val),
            }
        )
    now = utcnow()
    db.quiz_rounds.update_one({"id": round_id}, {"$set": {"status": "answered", "answered_at": now}})
    db.projects.update_one({"id": project_id}, {"$set": {"updated_at": now}})
    rnd = db.quiz_rounds.find_one({"id": round_id}, {"_id": 0})
    notify_orchestrator("quiz.answered", project_id, {"round_id": round_id})
    schedule_broadcast(project_id, {"type": "quiz.answered", "project_id": project_id, "round_id": round_id})
    return _round_out(db, rnd)


@router.post("/{project_id}/quiz/complete", dependencies=[Depends(require_bot_token)])
def complete_quiz(project_id: str, db: Database = Depends(get_db)) -> dict:
    project = get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    now = utcnow()
    db.projects.update_one(
        {"id": project_id},
        {"$set": {"quiz_complete": True, "updated_at": now}},
    )
    db.stages.update_one(
        {"project_id": project_id, "name": "requirements", "status": "clarifying"},
        {"$set": {"status": "active"}},
    )
    notify_orchestrator("quiz.complete", project_id, {})
    schedule_broadcast(project_id, {"type": "quiz.complete", "project_id": project_id})
    return {"ok": True, "quiz_complete": True}
