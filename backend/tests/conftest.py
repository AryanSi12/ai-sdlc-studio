import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Force test settings before app import
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["BOT_TOKEN"] = "test-bot-token"
os.environ["ORCHESTRATOR_WEBHOOK_URL"] = ""

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Bot  # noqa: E402


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    for bot_id, name, role in [
        ("orchestrator", "Orchestrator", "Manager"),
        ("requirement_gatherer", "Requirement Gatherer", "Requirements"),
        ("designer", "Designer", "Architecture"),
        ("developer", "Developer", "Implementation"),
        ("tester", "Tester", "QA"),
        ("deployer", "Deployer", "Release"),
        ("maintainer", "Maintainer", "Existing repos"),
    ]:
        db.add(Bot(id=bot_id, name=name, role=role, status="idle", note=""))
    db.commit()
    db.close()

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
