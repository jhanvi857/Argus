"""Goldman Sachs official career portal adapter.

Hits Goldman Sachs Careers JSON API, returning genuine Technology / Summer Analyst roles.
"""
from typing import Dict, Any, List, Optional
from .base import BaseAdapter
from .models import ExtractedPosting


class GoldmanSachsAdapter(BaseAdapter):
    """Adapter for official Goldman Sachs Careers JSON endpoint."""

    DEFAULT_API_URL = "https://api-enterprise.gs.com/careers/v1/jobs"

    def __init__(
        self,
        company_name: str = "Goldman Sachs",
        careers_url: str = "https://www.goldmansachs.com/careers/",
        ats_url: Optional[str] = None,
        query: str = "Technology",
        limit: int = 50,
        **kwargs,
    ):
        super().__init__(company_name, careers_url, ats_url=ats_url, **kwargs)
        self.api_url = ats_url or self.DEFAULT_API_URL
        self.query = query
        self.limit = limit

    def fetch_raw_payload(self) -> Dict[str, Any]:
        """Fetches raw JSON from Goldman Sachs careers API."""
        params = {
            "keyword": self.query,
            "limit": self.limit,
            "division": "Engineering",
        }
        return self.http_get_json(self.api_url, params=params)

    def parse_postings(self, raw_payload: Dict[str, Any]) -> List[ExtractedPosting]:
        """Extracts normalized job postings from Goldman Sachs JSON."""
        jobs = raw_payload.get("jobs") or raw_payload.get("data") or []
        extracted = []

        for item in jobs:
            job_id = str(item.get("jobId") or item.get("id") or item.get("requisitionId") or "").strip()
            title = (item.get("title") or item.get("role") or "").strip()
            if not job_id or not title:
                continue

            url = item.get("url") or f"https://www.goldmansachs.com/careers/job-search/?job_id={job_id}"
            division = item.get("division") or item.get("businessUnit") or "Engineering"
            location = item.get("location") or item.get("city") or "Multiple Locations"

            extracted.append(
                ExtractedPosting(
                    external_id=job_id,
                    title=title,
                    team=division,
                    location=location,
                    url=url,
                    deadline=item.get("deadline"),
                    raw_json=item,
                )
            )

        return extracted
