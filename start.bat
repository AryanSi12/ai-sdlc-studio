@echo off
set ROOT=%~dp0
cd /d "%ROOT%"
echo ==> Backend
cd backend
if not exist .venv python -m venv .venv
call .venv\Scripts\activate.bat
pip install -q -r requirements.txt
if not exist .env copy .env.example .env
python seed.py
if exist ..\data\tiny-todo-export.json if not exist ai_sdlc.db python scripts\import_data.py ..\data\tiny-todo-export.json
start "AI-SDLC-Backend" cmd /k "uvicorn app.main:app --host 127.0.0.1 --port 8000"
cd /d "%ROOT%frontend"
if not exist node_modules call npm install
if not exist .env echo VITE_API_URL=http://127.0.0.1:8000> .env
start "AI-SDLC-Frontend" cmd /k "npm run dev -- --host 127.0.0.1 --port 5173"
cd /d "%ROOT%"
echo Backend  http://127.0.0.1:8000/health
echo Frontend http://127.0.0.1:5173
