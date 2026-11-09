from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class QuizQuestionIn(BaseModel):
    id: str | None = None
    text: str
    kind: Literal["single", "multi", "text", "scale"]
    options: list[str] = Field(default_factory=list)
    required: bool = True
    help: str | None = None


class QuizCreateIn(BaseModel):
    questions: list[QuizQuestionIn]
    replace_open: bool = True


class QuizQuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    text: str
    kind: str
    options: list[str] = Field(default_factory=list)
    required: bool = True
    help: str | None = None
    sort_order: int = 0


class QuizAnswerOut(BaseModel):
    question_id: str
    question_text: str | None = None
    kind: str | None = None
    value: Any


class QuizRoundOut(BaseModel):
    id: str
    project_id: str
    round_number: int
    status: str
    created_at: datetime
    answered_at: datetime | None = None
    questions: list[QuizQuestionOut] = Field(default_factory=list)
    answers: list[QuizAnswerOut] = Field(default_factory=list)
    project_name: str | None = None


class QuizAnswersIn(BaseModel):
    answers: list[dict[str, Any]]  # [{question_id, value}]
    answered_by: str = "Aryan Singh"


class DocumentCreateIn(BaseModel):
    kind: Literal["requirements", "design", "test_report", "release_notes", "codebase_summary"]
    title: str
    markdown: str
    bot: str = "requirement_gatherer"
    link_to_stage: bool = True


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    kind: str
    title: str
    markdown: str
    created_by_bot: str
    created_at: datetime
    viewer_path: str | None = None
