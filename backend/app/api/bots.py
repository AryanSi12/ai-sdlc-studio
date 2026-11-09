from __future__ import annotations

from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.database import get_db
from app.schemas.schemas import BotOut

router = APIRouter(prefix="/api/bots", tags=["bots"])


@router.get("", response_model=list[BotOut])
def list_bots(db: Database = Depends(get_db)) -> list[dict]:
    return list(db.bots.find({}, {"_id": 0}).sort("id", 1))
