from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ProjectCreateJSON(BaseModel):
    name: str | None = None
    description: str = ""
    repo_url: str | None = None
    change: str = ""
    idea_text: str | None = None
    type: str | None = None  # existing | idea | new


class StageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    status: str
    bot: str
    output_label: str | None = None
    output_url: str | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None


class ApprovalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    gate: str
    status: str
    summary: str
    comment: str | None = None
    decided_by: str | None = None
    created_at: datetime
    decided_at: datetime | None = None
    project_name: str | None = None
    project_stage: str | None = None


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    bot: str
    action: str
    details: str | None = None
    reason: str | None = None
    created_at: datetime
    project_name: str | None = None


class ProjectSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str
    type: str
    repo_url: str | None = None
    current_stage: str
    status: str
    active_bot: str
    quiz_complete: bool = False
    created_at: datetime
    updated_at: datetime


class ProjectDetail(ProjectSummary):
    spec_md: str | None = None
    stages: list[StageOut] = Field(default_factory=list)
    approvals: list[ApprovalOut] = Field(default_factory=list)
    events: list[EventOut] = Field(default_factory=list)


class EventCreate(BaseModel):
    project_id: str
    bot: str
    action: str
    details: str | None = None
    reason: str | None = None
    stage_name: str | None = None
    stage_status: Literal["pending", "active", "done", "failed"] | None = None
    output_label: str | None = None
    output_url: str | None = None
    request_approval: Literal["design", "release"] | None = None
    approval_summary: str | None = None
    project_status: Literal["running", "waiting_approval", "failed", "done"] | None = None
    active_bot: str | None = None


class ApprovalDecision(BaseModel):
    decision: Literal["approved", "rejected"]
    comment: str | None = None
    decided_by: str = "Aryan Singh"


class BotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    role: str
    status: str
    note: str


class FindingOut(BaseModel):
    id: str
    severity: str
    title: str
    detail: str


class SuggestionOut(BaseModel):
    id: str
    title: str
    impact: str
    estimate: str
    description: str


class MaintainerView(BaseModel):
    project_id: str
    repo: str | None
    health: dict
    summary: str
    issues: list[FindingOut]
    suggestions: list[SuggestionOut]
