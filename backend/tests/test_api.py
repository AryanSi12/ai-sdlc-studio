from io import BytesIO


BOT_HEADERS = {"X-Bot-Token": "test-bot-token"}


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_create_project_from_md(client):
    files = {"spec_file": ("orbit-inventory.md", BytesIO(b"# Orbit\n\nSKU tracking\n"), "text/markdown")}
    data = {"description": "Warehouse SKU tracking MVP"}
    r = client.post("/api/projects", data=data, files=files)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["type"] == "new"
    assert body["name"] == "Orbit Inventory"
    assert body["current_stage"] == "requirements"
    assert body["status"] == "running"
    assert len(body["stages"]) == 5
    assert body["stages"][0]["status"] == "active"
    assert any(e["bot"] == "orchestrator" for e in body["events"])


def test_create_project_existing_json(client):
    r = client.post(
        "/api/projects/json",
        json={
            "repo_url": "https://github.com/acme/atlas-crm",
            "change": "Add billing module",
            "name": "Atlas CRM Revamp",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["type"] == "existing"
    assert body["active_bot"] == "maintainer"
    assert body["repo_url"].endswith("atlas-crm")


def test_event_requires_token(client):
    # create project first
    r = client.post(
        "/api/projects/json",
        json={"repo_url": "https://github.com/acme/x", "change": "fix"},
    )
    pid = r.json()["id"]

    bad = client.post(
        "/api/events",
        json={"project_id": pid, "bot": "developer", "action": "Wrote code"},
    )
    assert bad.status_code == 401

    ok = client.post(
        "/api/events",
        headers=BOT_HEADERS,
        json={
            "project_id": pid,
            "bot": "designer",
            "action": "Published design",
            "reason": "Ready for review",
            "stage_name": "design",
            "stage_status": "done",
            "request_approval": "design",
            "approval_summary": "Please approve design",
        },
    )
    assert ok.status_code == 201, ok.text
    ev = ok.json()
    assert ev["bot"] == "designer"

    detail = client.get(f"/api/projects/{pid}").json()
    assert detail["status"] == "waiting_approval"
    assert any(a["gate"] == "design" and a["status"] == "pending" for a in detail["approvals"])


def test_approval_approve_advances_stage(client):
    r = client.post(
        "/api/projects/json",
        json={"repo_url": "https://github.com/acme/y", "change": "feature", "name": "Y"},
    )
    pid = r.json()["id"]

    client.post(
        "/api/events",
        headers=BOT_HEADERS,
        json={
            "project_id": pid,
            "bot": "designer",
            "action": "Design ready",
            "stage_name": "design",
            "stage_status": "active",
            "request_approval": "design",
            "approval_summary": "Approve design please",
        },
    )
    approvals = client.get("/api/approvals", params={"status": "pending"}).json()
    assert len(approvals) >= 1
    aid = approvals[0]["id"]

    decided = client.post(
        f"/api/approvals/{aid}",
        json={"decision": "approved", "comment": "LGTM", "decided_by": "Aryan Singh"},
    )
    assert decided.status_code == 200, decided.text
    assert decided.json()["status"] == "approved"

    detail = client.get(f"/api/projects/{pid}").json()
    assert detail["current_stage"] == "development"
    assert detail["status"] == "running"
    assert detail["active_bot"] == "developer"
    stages = {s["name"]: s["status"] for s in detail["stages"]}
    assert stages["design"] == "done"
    assert stages["development"] == "active"


def test_approval_reject_sends_back(client):
    r = client.post(
        "/api/projects/json",
        json={"repo_url": "https://github.com/acme/z", "change": "feature", "name": "Z"},
    )
    pid = r.json()["id"]
    client.post(
        "/api/events",
        headers=BOT_HEADERS,
        json={
            "project_id": pid,
            "bot": "designer",
            "action": "Design ready",
            "stage_name": "design",
            "stage_status": "active",
            "request_approval": "design",
            "approval_summary": "Approve?",
        },
    )
    aid = client.get("/api/approvals", params={"status": "pending"}).json()[0]["id"]
    decided = client.post(
        f"/api/approvals/{aid}",
        json={"decision": "rejected", "comment": "Revisit tenancy model"},
    )
    assert decided.status_code == 200
    assert decided.json()["status"] == "rejected"
    detail = client.get(f"/api/projects/{pid}").json()
    assert detail["current_stage"] == "design"
    assert detail["active_bot"] == "designer"
    assert detail["status"] == "running"


def test_list_bots(client):
    r = client.get("/api/bots")
    assert r.status_code == 200
    assert len(r.json()) == 7


def test_next_action_after_design_approval(client):
    r = client.post(
        "/api/projects/json",
        json={"repo_url": "https://github.com/acme/n", "change": "x", "name": "N"},
    )
    pid = r.json()["id"]
    client.post(
        "/api/events",
        headers=BOT_HEADERS,
        json={
            "project_id": pid,
            "bot": "designer",
            "action": "Design ready",
            "stage_name": "design",
            "stage_status": "active",
            "request_approval": "design",
            "approval_summary": "Approve?",
        },
    )
    waiting = client.get(f"/api/projects/{pid}/next-action").json()
    assert waiting["action"] == "wait_for_approval"
    aid = client.get("/api/approvals", params={"status": "pending"}).json()[0]["id"]
    client.post(f"/api/approvals/{aid}", json={"decision": "approved", "comment": "ok"})
    nxt = client.get(f"/api/projects/{pid}/next-action").json()
    assert nxt["action"] in ("start_development", "continue")
    assert nxt["latest_decision"]["status"] == "approved"
