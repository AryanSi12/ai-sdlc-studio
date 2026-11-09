import os

import pytest
from fastapi.testclient import TestClient

os.environ["MONGODB_URI"] = "mongomock://localhost"
os.environ["MONGODB_DB_NAME"] = "ai_sdlc_test"
os.environ["BOT_TOKEN"] = "test-bot-token"
os.environ["ORCHESTRATOR_WEBHOOK_URL"] = ""

from app.config import get_settings  # noqa: E402

get_settings.cache_clear()

from app.database import get_client, get_db, init_db, reset_client_cache  # noqa: E402
from app.main import app  # noqa: E402
from app.models import BOTS_SEED  # noqa: E402
from seed import seed  # noqa: E402


@pytest.fixture()
def client():
    reset_client_cache()
    get_settings.cache_clear()
    os.environ["MONGODB_URI"] = "mongomock://localhost"
    os.environ["MONGODB_DB_NAME"] = "ai_sdlc_test"
    reset_client_cache()
    client = get_client()
    # Drop all collections for isolation
    db = client["ai_sdlc_test"]
    for name in db.list_collection_names():
        db.drop_collection(name)
    init_db()
    seed()

    def override_get_db():
        yield client["ai_sdlc_test"]

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    for name in db.list_collection_names():
        db.drop_collection(name)
    reset_client_cache()
