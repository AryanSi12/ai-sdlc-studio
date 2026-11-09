# Project: Tiny Todo API

## Goal
A minimal REST API to manage a personal todo list, used as the first end-to-end test of AI SDLC Studio.

## Features
1. Create a todo (title required, optional due date).
2. List todos, with a filter for done / not done.
3. Mark a todo as done or undone.
4. Delete a todo.

## Constraints
- Python 3.11 + FastAPI, SQLite storage.
- Automated tests with pytest; all must pass.
- Include a /health endpoint.
- Deployable to Render as a web service.

## Out of scope
- Authentication, multiple users, frontend UI.
