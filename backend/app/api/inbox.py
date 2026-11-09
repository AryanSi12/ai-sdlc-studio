from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import QuizRound

router = APIRouter(prefix="/api/inbox", tags=["inbox"])


@router.get("/needs-input")
def needs_input(db: Session = Depends(get_db)) -> list[dict]:
    rounds = (
        db.query(QuizRound)
        .options(joinedload(QuizRound.project), joinedload(QuizRound.questions))
        .filter(QuizRound.status == "open")
        .order_by(QuizRound.created_at.desc())
        .all()
    )
    return [
        {
            "kind": "quiz",
            "project_id": r.project_id,
            "project_name": r.project.name if r.project else None,
            "round_id": r.id,
            "round_number": r.round_number,
            "question_count": len(r.questions),
            "created_at": r.created_at,
            "summary": f"Answer clarifying quiz (round {r.round_number})",
        }
        for r in rounds
    ]
