BOT_HEADERS = {"X-Bot-Token": "test-bot-token"}


def test_idea_project_and_quiz_flow(client):
    r = client.post(
        "/api/projects/json",
        json={"type": "idea", "name": "Habit Tracker", "idea_text": "An app to track daily habits with streaks."},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["type"] == "idea"
    assert body["stages"][0]["status"] == "clarifying"
    pid = body["id"]

    quiz = client.post(
        f"/api/projects/{pid}/quiz",
        headers=BOT_HEADERS,
        json={
            "questions": [
                {"text": "Who is the primary user?", "kind": "single", "options": ["Individuals", "Teams"], "required": True},
                {"text": "List must-have features", "kind": "multi", "options": ["Streaks", "Reminders", "Social"], "required": True},
                {"text": "Anything else?", "kind": "text", "required": False},
                {"text": "How important is mobile?", "kind": "scale", "options": ["1", "2", "3", "4", "5"], "required": True},
            ]
        },
    )
    assert quiz.status_code == 200, quiz.text
    rnd = quiz.json()
    assert rnd["status"] == "open"
    assert len(rnd["questions"]) == 4
    rid = rnd["id"]

    na = client.get(f"/api/projects/{pid}/next-action").json()
    assert na["action"] == "answer_quiz"

    qids = [q["id"] for q in rnd["questions"]]
    ans = client.post(
        f"/api/projects/{pid}/quiz/{rid}/answers",
        json={
            "answers": [
                {"question_id": qids[0], "value": "Individuals"},
                {"question_id": qids[1], "value": ["Streaks", "Reminders"]},
                {"question_id": qids[3], "value": 5},
            ],
            "answered_by": "Aryan Singh",
        },
    )
    assert ans.status_code == 200, ans.text
    assert ans.json()["status"] == "answered"

    na2 = client.get(f"/api/projects/{pid}/next-action").json()
    assert na2["action"] == "quiz_answered"
    assert na2["quiz"]["answers"]

    done = client.post(f"/api/projects/{pid}/quiz/complete", headers=BOT_HEADERS)
    assert done.status_code == 200

    doc = client.post(
        f"/api/projects/{pid}/documents",
        headers=BOT_HEADERS,
        json={
            "kind": "requirements",
            "title": "Requirements",
            "markdown": "# Requirements\n\n- Habits\n- Streaks\n",
            "bot": "requirement_gatherer",
        },
    )
    assert doc.status_code == 200, doc.text
    did = doc.json()["id"]
    listed = client.get(f"/api/projects/{pid}/documents").json()
    assert len(listed) >= 1
    one = client.get(f"/api/projects/{pid}/documents/{did}").json()
    assert "Habits" in one["markdown"]

    inbox = client.get("/api/inbox/needs-input").json()
    assert isinstance(inbox, list)


def test_quiz_requires_token(client):
    r = client.post("/api/projects/json", json={"type": "idea", "idea_text": "x", "name": "X"})
    pid = r.json()["id"]
    bad = client.post(f"/api/projects/{pid}/quiz", json={"questions": [{"text": "Q?", "kind": "text"}]})
    assert bad.status_code == 401
