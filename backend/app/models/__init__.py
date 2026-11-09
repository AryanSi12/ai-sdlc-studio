"""Mongo document helpers (no ORM)."""
from app.models.docs import (  # noqa: F401
    BOTS_SEED,
    as_iso,
    new_id,
    parse_dt,
    utcnow,
)
