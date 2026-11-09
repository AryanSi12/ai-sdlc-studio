$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "==> Backend venv"
Set-Location backend
if (-not (Test-Path .venv)) { python -m venv .venv }
& .\.venv\Scripts\Activate.ps1
pip install -q -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
python seed.py
if ((Test-Path ..\data\tiny-todo-export.json) -and -not (Test-Path ai_sdlc.db)) {
  python scripts/import_data.py ..\data\tiny-todo-export.json
}
Start-Process -NoNewWindow -FilePath "uvicorn" -ArgumentList "app.main:app","--host","127.0.0.1","--port","8000"
Set-Location $Root

Write-Host "==> Frontend"
Set-Location frontend
if (-not (Test-Path node_modules)) { npm install }
if (-not (Test-Path .env)) { "VITE_API_URL=http://127.0.0.1:8000" | Out-File -Encoding utf8 .env }
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run","dev","--","--host","127.0.0.1","--port","5173"
Set-Location $Root

Write-Host "Backend  http://127.0.0.1:8000/health"
Write-Host "Frontend http://127.0.0.1:5173"
Write-Host "Close the terminal windows or stop the processes to shut down."
