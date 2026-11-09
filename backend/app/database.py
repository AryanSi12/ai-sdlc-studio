"""MongoDB connection (pymongo). Uses mongomock when MONGODB_URI=mongomock://..."""
from __future__ import annotations

from collections.abc import Generator
from functools import lru_cache
from typing import Any

from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.database import Database

from app.config import get_settings

_client: MongoClient | None = None


def _make_client(uri: str) -> MongoClient:
    if uri.startswith("mongomock://"):
        import mongomock

        return mongomock.MongoClient()
    return MongoClient(uri)


@lru_cache
def get_client() -> MongoClient:
    settings = get_settings()
    uri = settings.mongodb_uri
    return _make_client(uri)


def get_db() -> Generator[Database, None, None]:
    client = get_client()
    db_name = get_settings().mongodb_db_name
    yield client[db_name]


def get_database() -> Database:
    return get_client()[get_settings().mongodb_db_name]


def init_db() -> None:
    db = get_database()
    # Indexes
    db.projects.create_index([("updated_at", DESCENDING)])
    db.stages.create_index([("project_id", ASCENDING), ("name", ASCENDING)], unique=True)
    db.approvals.create_index([("project_id", ASCENDING), ("status", ASCENDING)])
    db.events.create_index([("project_id", ASCENDING), ("created_at", DESCENDING)])
    db.events.create_index([("bot", ASCENDING)])
    db.quiz_rounds.create_index([("project_id", ASCENDING), ("round_number", DESCENDING)])
    db.quiz_questions.create_index([("round_id", ASCENDING), ("sort_order", ASCENDING)])
    db.quiz_answers.create_index([("round_id", ASCENDING)])
    db.documents.create_index([("project_id", ASCENDING), ("kind", ASCENDING)])
    db.bots.create_index([("id", ASCENDING)], unique=True)


def reset_client_cache() -> None:
    """For tests — clear cached client after env change."""
    global _client
    get_client.cache_clear()
    _client = None
