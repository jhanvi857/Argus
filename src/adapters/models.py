"""Data models for extracted job postings from ATS adapters."""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

from src.db.models import Posting


class ExtractedPosting(BaseModel):
    """Normalized posting representation extracted from raw ATS payloads."""

    external_id: str
    title: str
    url: str
    team: Optional[str] = None
    location: Optional[str] = None
    deadline: Optional[datetime] = None
    raw_json: Dict[str, Any] = Field(default_factory=dict)

    def to_db_posting(self, company_id: int) -> Posting:
        """Converts extracted posting into a database Posting model."""
        return Posting(
            company_id=company_id,
            external_id=self.external_id,
            title=self.title,
            team=self.team,
            deadline=self.deadline,
            url=self.url,
            raw_json=self.raw_json,
            status="new",
            relevant=None,
            notified_at=None,
        )
