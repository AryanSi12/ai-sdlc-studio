# AI SDLC Studio - one-command start on Windows (needs only Python 3.10+)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$root\backend"
if (-not (Test-Path ".venv")) { python -m venv .venv }
& .\.venv\Scripts\python.exe -m pip install -q -r requirements.txt
if (-not (Test-Path ".env")) { Copy-Item .env.example .env }
if (-not (Test-Path "ai_sdlc.db") -and (Test-Path "..\data\tiny-todo-export.json")) {
  & .\.venv\Scripts\python.exe scripts\import_data.py ..\data\tiny-todo-export.json
}
& .\.venv\Scripts\python.exe seed.py
Write-Host "AI SDLC Studio running at http://127.0.0.1:8000"
& .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
