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
    status: str = "new"  # new | reviewed | applied | ignored | closed
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


class ExperienceLog(BaseModel):
    id: Optional[int] = None
    company_id: int
    posting_id: Optional[int] = None
    application_id: Optional[int] = None
    author_user_id: Optional[int] = None
    stage: str = "applied"
    technical_questions: Optional[str] = None
    takeaways: Optional[str] = None
    offer_details: Optional[str] = None
    oa_date: Optional[date] = None
    interview_date: Optional[date] = None
    interview_round: Optional[str] = None
    visibility: str = "private"  # 'private' | 'shared'
    author_display_mode: str = "named"  # 'named' | 'anonymous'
    verified_applicant: bool = False
    confidentiality_ack: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PrepResource(BaseModel):
    id: Optional[int] = None
    company_id: int
    posting_id: Optional[int] = None
    stage: Optional[str] = None
    title: Optional[str] = None
    snippet: str
    source: str  # 'LeetCode Discuss', 'TeamBlind', 'GeeksforGeeks'
    url: str
    fetched_at: Optional[datetime] = None


class MergedExperienceItem(BaseModel):
    id: Optional[int] = None
    source_type: str  # 'community' | 'external'
    stage: str
    technical_questions: Optional[str] = None
    takeaways: Optional[str] = None
    offer_details: Optional[str] = None
    author: str  # e.g. 'Anonymous', 'Jordan Lee', 'LeetCode Discuss'
    verified_applicant: bool = False
    url: Optional[str] = None
    created_at: Optional[datetime] = None
    author_user_id: Optional[int] = None
    visibility: Optional[str] = None

