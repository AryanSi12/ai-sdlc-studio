from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_bot_token
from app.database import get_db
from app.models import Event, Project, QuizAnswer, QuizQuestion, QuizRound
from app.models.models import utcnow
from app.schemas.quiz_docs import QuizAnswersIn, QuizCreateIn, QuizQuestionOut, QuizRoundOut
from app.services.orchestrator import notify_orchestrator
from app.services.ws_hub import schedule_broadcast

router = APIRouter(prefix="/api/projects", tags=["quiz"])


def _qid() -> str:
    return str(uuid.uuid4())


def _round_out(rnd: QuizRound, project_name: str | None = None) -> QuizRoundOut:
    qmap = {q.id: q for q in rnd.questions}
    questions = []
    for q in sorted(rnd.questions, key=lambda x: x.sort_order):
        try:
            options = json.loads(q.options_json or "[]")
        except json.JSONDecodeError:
            options = []
        questions.append(
            QuizQuestionOut(
                id=q.id,
                text=q.text,
                kind=q.kind,
                options=options,
                required=q.required,
                help=q.help,
                sort_order=q.sort_order,
            )
        )
    answers = []
    for a in rnd.answers:
        try:
            value = json.loads(a.value_json)
        except json.JSONDecodeError:
            value = a.value_json
        q = qmap.get(a.question_id)
        answers.append(
            {
                "question_id": a.question_id,
                "question_text": q.text if q else None,
                "kind": q.kind if q else None,
                "value": value,
            }
        )
    return QuizRoundOut(
        id=rnd.id,
        project_id=rnd.project_id,
        round_number=rnd.round_number,
        status=rnd.status,
        created_at=rnd.created_at,
        answered_at=rnd.answered_at,
        questions=questions,
        answers=answers,
        project_name=project_name,
    )


@router.post("/{project_id}/quiz", response_model=QuizRoundOut, dependencies=[Depends(require_bot_token)])
def create_quiz_round(project_id: str, body: QuizCreateIn, db: Session = Depends(get_db)) -> QuizRoundOut:
    project = db.query(Project).filter(Project.id == project_id).one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not body.questions:
        raise HTTPException(status_code=400, detail="At least one question required")

    if body.replace_open:
        for open_round in db.query(QuizRound).filter(QuizRound.project_id == project_id, QuizRound.status == "open"):
            open_round.status = "answered"  # supersede
            open_round.answered_at = open_round.answered_at or utcnow()

    last_num = (
        db.query(QuizRound)
        .filter(QuizRound.project_id == project_id)
        .order_by(QuizRound.round_number.desc())
        .first()
    )
    round_number = (last_num.round_number + 1) if last_num else 1
    rnd = QuizRound(id=_qid(), project_id=project_id, round_number=round_number, status="open")
    db.add(rnd)
    for i, q in enumerate(body.questions):
        db.add(
            QuizQuestion(
                id=q.id or _qid(),
                round_id=rnd.id,
                text=q.text,
                kind=q.kind,
                options_json=json.dumps(q.options or []),
                required=q.required,
                help=q.help,
                sort_order=i,
            )
        )

    # keep requirements in clarifying while quiz open
    for st in project.stages:
        if st.name == "requirements" and st.status in ("pending", "active", "clarifying"):
            st.status = "clarifying"
            if not st.started_at:
                st.started_at = utcnow()
    project.current_stage = "requirements"
    project.active_bot = "requirement_gatherer"
    project.status = "waiting_approval"  # reuse waiting for human input
    project.updated_at = utcnow()

    db.add(
        Event(
            id=_qid(),
            project_id=project_id,
            bot="requirement_gatherer",
            action="quiz.created",
            details=f"round={round_number} questions={len(body.questions)}",
            reason="Clarifying questions for the user",
        )
    )
    db.commit()
    rnd = (
        db.query(QuizRound)
        .options(joinedload(QuizRound.questions), joinedload(QuizRound.answers))
        .filter(QuizRound.id == rnd.id)
        .one()
    )
    notify_orchestrator("quiz.created", project_id, {"round_id": rnd.id, "round_number": round_number})
    schedule_broadcast(project_id, {"type": "quiz.created", "project_id": project_id, "round_id": rnd.id})
    return _round_out(rnd, project.name)


@router.get("/{project_id}/quiz/latest", response_model=QuizRoundOut | None)
def latest_quiz(project_id: str, db: Session = Depends(get_db)) -> QuizRoundOut | None:
    project = db.query(Project).filter(Project.id == project_id).one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    rnd = (
        db.query(QuizRound)
        .options(joinedload(QuizRound.questions), joinedload(QuizRound.answers))
        .filter(QuizRound.project_id == project_id)
        .order_by(QuizRound.round_number.desc())
        .first()
    )
    if not rnd:
        return None
    return _round_out(rnd, project.name)


@router.post("/{project_id}/quiz/{round_id}/answers", response_model=QuizRoundOut)
def submit_quiz_answers(
    project_id: str,
    round_id: str,
    body: QuizAnswersIn,
    db: Session = Depends(get_db),
) -> QuizRoundOut:
    project = db.query(Project).filter(Project.id == project_id).one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    rnd = (
        db.query(QuizRound)
        .options(joinedload(QuizRound.questions), joinedload(QuizRound.answers))
        .filter(QuizRound.id == round_id, QuizRound.project_id == project_id)
        .one_or_none()
    )
    if not rnd:
        raise HTTPException(status_code=404, detail="Quiz round not found")
    if rnd.status != "open":
        raise HTTPException(status_code=400, detail=f"Quiz round already {rnd.status}")

    q_by_id = {q.id: q for q in rnd.questions}
    for q in rnd.questions:
        if not q.required:
            continue
        if not any(a.get("question_id") == q.id for a in body.answers):
            raise HTTPException(status_code=400, detail=f"Missing required answer for: {q.text}")

    # clear prior answers if any
    for old in list(rnd.answers):
        db.delete(old)
    db.flush()

    for item in body.answers:
        qid = item.get("question_id")
        if qid not in q_by_id:
            raise HTTPException(status_code=400, detail=f"Unknown question_id {qid}")
        db.add(
            QuizAnswer(
                id=_qid(),
                round_id=rnd.id,
                question_id=qid,
                value_json=json.dumps(item.get("value")),
            )
        )

    rnd.status = "answered"
    rnd.answered_at = utcnow()
    project.status = "running"
    project.active_bot = "requirement_gatherer"
    project.updated_at = utcnow()
    db.add(
        Event(
            id=_qid(),
            project_id=project_id,
            bot="orchestrator",
            action="quiz.answered",
            details=f"round={rnd.round_number} by {body.answered_by}",
            reason="User completed clarifying quiz",
        )
    )
    db.commit()
    rnd = (
        db.query(QuizRound)
        .options(joinedload(QuizRound.questions), joinedload(QuizRound.answers))
        .filter(QuizRound.id == round_id)
        .one()
    )
    notify_orchestrator("quiz.answered", project_id, {"round_id": rnd.id, "round_number": rnd.round_number})
    schedule_broadcast(project_id, {"type": "quiz.answered", "project_id": project_id, "round_id": rnd.id})
    return _round_out(rnd, project.name)


@router.post("/{project_id}/quiz/complete", dependencies=[Depends(require_bot_token)])
def complete_quiz(project_id: str, db: Session = Depends(get_db)) -> dict:
    project = db.query(Project).filter(Project.id == project_id).one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    open_rounds = db.query(QuizRound).filter(QuizRound.project_id == project_id, QuizRound.status == "open").count()
    if open_rounds:
        raise HTTPException(status_code=400, detail="Cannot complete while a quiz round is still open")
    project.quiz_complete = True
    for st in project.stages:
        if st.name == "requirements" and st.status == "clarifying":
            st.status = "active"
    project.status = "running"
    project.active_bot = "requirement_gatherer"
    project.updated_at = utcnow()
    db.add(
        Event(
            id=_qid(),
            project_id=project_id,
            bot="requirement_gatherer",
            action="quiz.complete",
            details="Clarification complete — writing requirements",
            reason=None,
        )
    )
    db.commit()
    schedule_broadcast(project_id, {"type": "quiz.complete", "project_id": project_id})
    return {"project_id": project_id, "quiz_complete": True}
