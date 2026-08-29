"""Data models for Argus core entities."""
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class Company(BaseModel):
    id: Optional[int] = None
    name: str
    ats_type: str  # greenhouse, lever, workday, custom, etc.
    ats_url: Optional[str] = None
    careers_page_url: str
    last_checked_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Posting(BaseModel):
    id: Optional[int] = None
    company_id: int
    external_id: str
    title: str
    team: Optional[str] = None
    deadline: Optional[datetime] = None
    url: str
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    raw_json: Optional[Dict[str, Any]] = None
    status: str = "new"  # new | reviewed | applied | ignored
    relevant: Optional[bool] = None
    notified_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Project(BaseModel):
    id: str  # fixed slug identifier (e.g. 'nioflow', 'evora')
    name: str
    tech_stack: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    summary: str
    quantified_bullets: List[str] = Field(default_factory=list)
    resume_variants: Dict[str, List[str]] = Field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Match(BaseModel):
    id: Optional[int] = None
    posting_id: int
    recommended_project_ids: List[str] = Field(default_factory=list)
    rationale: str
    suggested_keywords: List[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None


class Application(BaseModel):
    id: Optional[int] = None
    posting_id: int
    resume_version: Optional[str] = None
    oa_date: Optional[date] = None
    referral_status: str = "none"  # none | requested | referred | pending
    stage: str = "applied"  # bookmarked | applied | oa | phone_screen | technical_interview | onsite | offer | rejected | withdrawn
    notes: Optional[str] = None
    updated_at: Optional[datetime] = None


class Snapshot(BaseModel):
    id: Optional[int] = None
    company_id: int
    fetched_at: Optional[datetime] = None
    raw_payload: Dict[str, Any]
