"""Greenhouse ATS Adapter for Argus."""
from typing import Dict, Any, List, Optional
from datetime import datetime
import re

from .base import BaseAdapter
from .models import ExtractedPosting


class GreenhouseAdapter(BaseAdapter):
    """Adapter for companies using Greenhouse ATS (boards-api.greenhouse.io)."""

    def __init__(
        self,
        company_name: str,
        careers_url: str,
        ats_url: Optional[str] = None,
        board_token: Optional[str] = None,
        **kwargs,
    ):
        super().__init__(company_name, careers_url, ats_url, **kwargs)
        self.board_token = board_token or self._extract_board_token()

    def _extract_board_token(self) -> str:
        """Derives Greenhouse board token from ats_url or careers_url or company name."""
        if self.ats_url:
            match = re.search(r"boards-api\.greenhouse\.io/v1/boards/([^/]+)", self.ats_url)
            if match:
                return match.group(1)
            match = re.search(r"boards\.greenhouse\.io/([^/]+)", self.ats_url)
            if match:
                return match.group(1)

        if self.careers_url:
            match = re.search(r"boards\.greenhouse\.io/([^/]+)", self.careers_url)
            if match:
                return match.group(1)

        # Fallback to sanitized company name slug
        return re.sub(r"[^a-zA-Z0-9_-]", "", self.company_name.lower())

    def get_api_endpoint(self) -> str:
        """Returns the Greenhouse jobs API endpoint URL."""
        if self.ats_url and "boards-api.greenhouse.io" in self.ats_url:
            return self.ats_url
        return f"https://boards-api.greenhouse.io/v1/boards/{self.board_token}/jobs?content=true"

    def fetch_raw_payload(self) -> Dict[str, Any]:
        """Fetches all active jobs for the Greenhouse board."""
        endpoint = self.get_api_endpoint()
        return self.http_get_json(endpoint)

    def parse_postings(self, raw_payload: Dict[str, Any]) -> List[ExtractedPosting]:
        """Parses Greenhouse raw JSON payload into normalized ExtractedPosting instances."""
        jobs = raw_payload.get("jobs", [])
        postings: List[ExtractedPosting] = []

        for job in jobs:
            if not isinstance(job, dict):
                continue

            external_id = str(job.get("id", "")).strip()
            title = str(job.get("title", "")).strip()
            url = str(job.get("absolute_url", "")).strip()

            if not external_id or not title:
                continue

            # Extract team/department
            departments = job.get("departments", [])
            team = None
            if departments and isinstance(departments, list) and isinstance(departments[0], dict):
                team = departments[0].get("name")

            # Extract location
            location = None
            loc_data = job.get("location")
            if isinstance(loc_data, dict):
                location = loc_data.get("name")
            elif isinstance(loc_data, str):
                location = loc_data

            # Parse deadline if present
            deadline = None
            updated_at_str = job.get("updated_at")
            if updated_at_str:
                try:
                    # ISO format parse
                    deadline = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
                except Exception:
                    pass

            postings.append(
                ExtractedPosting(
                    external_id=external_id,
                    title=title,
                    url=url or f"https://boards.greenhouse.io/{self.board_token}/jobs/{external_id}",
                    team=team,
                    location=location,
                    deadline=deadline,
                    raw_json=job,
                )
            )

        return postings
