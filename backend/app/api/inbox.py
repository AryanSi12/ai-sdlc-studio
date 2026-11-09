from __future__ import annotations

from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.database import get_db

router = APIRouter(prefix="/api/inbox", tags=["inbox"])


@router.get("/needs-input")
def needs_input(db: Database = Depends(get_db)) -> list[dict]:
    """Open quizzes that need human answers."""
    open_rounds = list(db.quiz_rounds.find({"status": "open"}, {"_id": 0}))
    out = []
    for rnd in open_rounds:
        project = db.projects.find_one({"id": rnd["project_id"]}, {"_id": 0, "id": 1, "name": 1})
        if not project:
            continue
        out.append(
            {
                "type": "quiz",
                "project_id": project["id"],
                "project_name": project["name"],
                "quiz_round_id": rnd["id"],
                "round_number": rnd.get("round_number"),
                "created_at": rnd.get("created_at"),
            }
        )
    return out
