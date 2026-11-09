# SDLC Bot Contract

Copy `bots/config.example.json` → `bots/config.json` (gitignored), or set `SDLC_API_BASE` / `SDLC_BOT_TOKEN`:

```json
{ "api_base": "http://127.0.0.1:8000", "bot_token": "dev-bot-token-change-me" }
```

On Aryan’s PC the API may be reached via a tunnel URL — put that in `api_base`.

## Auth

`POST /api/events`, quiz create/complete, and document upload require:

```
X-Bot-Token: <bot_token>
```

## Requirement Gatherer — idea quiz flow (contract)

1. **Detect idea project** — `GET /api/projects/{id}` → `type == "idea"`, requirements stage `clarifying`, `quiz_complete == false`.
2. **Read the idea** — use `description` / `spec_md` as the user’s plain-language brief.
3. **Ask 5–10 clarifying questions** covering: users, core features, platforms, data, integrations, auth, non-functional (perf/security), constraints, timeline, success criteria.
4. **POST quiz**
   ```bash
   python bots/sdlc_event.py quiz-create --project PID --file questions.json
   ```
   `questions.json`:
   ```json
   {
     "questions": [
       {"text": "Who is the primary user?", "kind": "single", "options": ["Individuals", "Teams", "Both"], "required": true, "help": "Pick one"},
       {"text": "Must-have features", "kind": "multi", "options": ["A", "B", "C"], "required": true},
       {"text": "Any hard constraints?", "kind": "text", "required": false},
       {"text": "How critical is mobile?", "kind": "scale", "options": ["1","2","3","4","5"], "required": true}
     ]
   }
   ```
5. **Wait for answers**
   ```bash
   python bots/sdlc_event.py quiz-wait --project PID
   # or poll: GET /api/projects/PID/next-action → action=quiz_answered (includes answers)
   ```
6. **Optional follow-up round** — `quiz-create` again with new questions.
7. **Finish clarification**
   ```bash
   python bots/sdlc_event.py quiz-complete --project PID
   ```
8. **Write requirements.md** and upload (so the PC UI can open it — do **not** rely on box file paths):
   ```bash
   python bots/sdlc_event.py doc-upload --project PID --kind requirements --title "Requirements" --file requirements.md
   ```
9. **Hand off** — post an event, e.g. `requirements.completed` with `stage_name=requirements` `stage_status=done` `active_bot=designer`, then Orchestrator continues.

`next-action` while quiz is open → `answer_quiz` (user). After submit → `quiz_answered` (+ answers payload). After `quiz-complete` → continue writing docs.

## Documents API

```bash
# Upload
python bots/sdlc_event.py doc-upload --project PID --kind design --title "Architecture" --file design.md --bot designer

# List / get
curl $API/api/projects/PID/documents
curl $API/api/projects/PID/documents/DOC_ID
```

Kinds: `requirements` | `design` | `test_report` | `release_notes` | `codebase_summary`  
Viewer path in UI: `/projects/{id}/docs/{doc_id}` (also set as stage `output_url`).

## Other endpoints (unchanged)

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | no |
| GET/POST | `/api/projects` | no / multipart |
| GET | `/api/projects/{id}/next-action` | no |
| POST | `/api/events` | token |
| POST | `/api/projects/{id}/quiz` | token |
| GET | `/api/projects/{id}/quiz/latest` | no |
| POST | `/api/projects/{id}/quiz/{round}/answers` | no (user) |
| POST | `/api/projects/{id}/quiz/complete` | token |
| GET | `/api/inbox/needs-input` | no |
| POST/GET | `/api/projects/{id}/documents` | token / no |

## Event CLI (legacy)

```bash
python bots/sdlc_event.py --bot developer --project PID --action development.completed \
  --stage development --status done --output-label PR --output-url https://...
```
