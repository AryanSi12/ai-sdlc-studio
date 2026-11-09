#!/usr/bin/env python3
"""CLI for SDLC bots — events, quiz, documents (stdlib only)."""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

CONFIG_DIR = Path(__file__).resolve().parent
CONFIG_PATH = CONFIG_DIR / "config.json"
CONFIG_EXAMPLE_PATH = CONFIG_DIR / "config.example.json"


def load_config() -> dict:
    """Precedence: env vars > config.json > config.example.json > local defaults."""
    cfg = {"api_base": "http://127.0.0.1:8000", "bot_token": "dev-bot-token-change-me"}
    for path in (CONFIG_EXAMPLE_PATH, CONFIG_PATH):
        if path.exists():
            try:
                cfg.update(json.loads(path.read_text()))
            except json.JSONDecodeError as e:
                print(f"Warning: invalid JSON in {path}: {e}", file=sys.stderr)
    cfg["api_base"] = os.environ.get("SDLC_API_BASE", cfg.get("api_base", "")).rstrip("/")
    cfg["bot_token"] = os.environ.get("SDLC_BOT_TOKEN", os.environ.get("BOT_TOKEN", cfg.get("bot_token", "")))
    return cfg


def request_json(method: str, url: str, token: str | None = None, body: dict | None = None) -> dict | list | None:
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json"} if body is not None else {}
    if token:
        headers["X-Bot-Token"] = token
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        print(f"HTTP {e.code}: {err}", file=sys.stderr)
        raise SystemExit(1) from e


def cmd_event(args, cfg):
    if args.next_action:
        out = request_json("GET", f"{cfg['api_base']}/api/projects/{args.project}/next-action")
        print(json.dumps(out, indent=2))
        return
    body = {
        "project_id": args.project,
        "bot": args.bot,
        "action": args.action,
        "details": args.details,
        "reason": args.reason,
        "stage_name": args.stage_name,
        "stage_status": args.stage_status,
        "output_label": args.output_label,
        "output_url": args.output_url,
        "request_approval": args.request_approval,
        "approval_summary": args.approval_summary,
        "project_status": args.project_status,
        "active_bot": args.active_bot,
    }
    body = {k: v for k, v in body.items() if v is not None}
    print(json.dumps(request_json("POST", f"{cfg['api_base']}/api/events", cfg["bot_token"], body), indent=2))


def cmd_quiz_create(args, cfg):
    questions = json.loads(Path(args.file).read_text())
    if isinstance(questions, dict) and "questions" in questions:
        payload = questions
    else:
        payload = {"questions": questions}
    out = request_json("POST", f"{cfg['api_base']}/api/projects/{args.project}/quiz", cfg["bot_token"], payload)
    print(json.dumps(out, indent=2))


def cmd_quiz_get(args, cfg):
    out = request_json("GET", f"{cfg['api_base']}/api/projects/{args.project}/quiz/latest")
    print(json.dumps(out, indent=2))


def cmd_quiz_wait(args, cfg):
    deadline = time.time() + args.timeout
    while time.time() < deadline:
        na = request_json("GET", f"{cfg['api_base']}/api/projects/{args.project}/next-action")
        if na and na.get("action") == "quiz_answered":
            print(json.dumps(na, indent=2))
            return
        if na and na.get("action") == "answer_quiz":
            time.sleep(args.poll)
            continue
        # if quiz complete / moved on
        if na and na.get("quiz_complete"):
            print(json.dumps(na, indent=2))
            return
        time.sleep(args.poll)
    print("Timed out waiting for quiz answers", file=sys.stderr)
    raise SystemExit(2)


def cmd_quiz_complete(args, cfg):
    out = request_json("POST", f"{cfg['api_base']}/api/projects/{args.project}/quiz/complete", cfg["bot_token"], {})
    print(json.dumps(out, indent=2))


def cmd_doc_upload(args, cfg):
    md = Path(args.file).read_text()
    body = {
        "kind": args.kind,
        "title": args.title or Path(args.file).stem,
        "markdown": md,
        "bot": args.bot,
        "link_to_stage": not args.no_link,
    }
    out = request_json("POST", f"{cfg['api_base']}/api/projects/{args.project}/documents", cfg["bot_token"], body)
    print(json.dumps(out, indent=2))


def main() -> int:
    cfg = load_config()
    p = argparse.ArgumentParser(description="SDLC Studio bot CLI")
    sub = p.add_subparsers(dest="cmd")

    # legacy flat mode still works if no subcommand
    p.add_argument("--bot", default="orchestrator")
    p.add_argument("--project", default=None)
    p.add_argument("--action", default=None)
    p.add_argument("--details", default=None)
    p.add_argument("--reason", default=None)
    p.add_argument("--stage", default=None, dest="stage_name")
    p.add_argument("--status", default=None, dest="stage_status")
    p.add_argument("--output-label", default=None)
    p.add_argument("--output-url", default=None)
    p.add_argument("--request-approval", default=None, choices=["design", "release"])
    p.add_argument("--approval-summary", default=None)
    p.add_argument("--project-status", default=None)
    p.add_argument("--active-bot", default=None)
    p.add_argument("--next-action", action="store_true")

    qc = sub.add_parser("quiz-create", help="POST a quiz round from JSON file")
    qc.add_argument("--project", required=True)
    qc.add_argument("--file", required=True)
    qc.add_argument("--bot", default="requirement_gatherer")

    qg = sub.add_parser("quiz-get", help="GET latest quiz round")
    qg.add_argument("--project", required=True)
    qg.add_argument("--bot", default="requirement_gatherer")

    qw = sub.add_parser("quiz-wait", help="Poll until quiz_answered")
    qw.add_argument("--project", required=True)
    qw.add_argument("--bot", default="requirement_gatherer")
    qw.add_argument("--timeout", type=int, default=600)
    qw.add_argument("--poll", type=float, default=2.0)

    qx = sub.add_parser("quiz-complete", help="Mark clarification complete")
    qx.add_argument("--project", required=True)
    qx.add_argument("--bot", default="requirement_gatherer")

    du = sub.add_parser("doc-upload", help="Upload a markdown document")
    du.add_argument("--project", required=True)
    du.add_argument("--kind", required=True, choices=["requirements", "design", "test_report", "release_notes", "codebase_summary"])
    du.add_argument("--title", default=None)
    du.add_argument("--file", required=True)
    du.add_argument("--bot", default="requirement_gatherer")
    du.add_argument("--no-link", action="store_true")

    args = p.parse_args()
    if args.cmd == "quiz-create":
        cmd_quiz_create(args, cfg)
    elif args.cmd == "quiz-get":
        cmd_quiz_get(args, cfg)
    elif args.cmd == "quiz-wait":
        cmd_quiz_wait(args, cfg)
    elif args.cmd == "quiz-complete":
        cmd_quiz_complete(args, cfg)
    elif args.cmd == "doc-upload":
        cmd_doc_upload(args, cfg)
    else:
        if not args.project:
            p.error("--project is required (or use a subcommand)")
        if not args.action and not args.next_action:
            p.error("--action is required unless --next-action")
        cmd_event(args, cfg)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
