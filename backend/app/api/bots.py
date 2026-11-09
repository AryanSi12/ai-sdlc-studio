from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Bot
from app.schemas.schemas import BotOut

router = APIRouter(prefix="/api/bots", tags=["bots"])


@router.get("", response_model=list[BotOut])
def list_bots(db: Session = Depends(get_db)) -> list[Bot]:
    return db.query(Bot).order_by(Bot.id).all()
