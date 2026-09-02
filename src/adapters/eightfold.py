"""Eightfold AI career portal adapter (American Express, PayPal, etc.).

Eightfold career sites load jobs via their apply API:
  GET https://{tenant}.eightfold.ai/api/apply/v2/jobs
"""
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse
from .base import BaseAdapter
from .models import ExtractedPosting


class EightfoldAdapter(BaseAdapter):
    """Adapter for Eightfold AI career portal search API."""

    def __init__(
        self,
        company_name: str,
        careers_url: str,
        ats_url: Optional[str] = None,
        query: str = "software engineer intern",
        limit: int = 50,
        **kwargs,
    ):
        super().__init__(company_name, careers_url, ats_url=ats_url, **kwargs)
        self.query = query
        self.limit = limit
        self._resolve_api_url()

    def _resolve_api_url(self) -> None:
        source_url = self.ats_url or self.careers_url
        parsed = urlparse(source_url)
        netloc = parsed.netloc or "jobs.eightfold.ai"
        domain = netloc.split(".")[0]
        self.api_url = f"https://{netloc}/api/apply/v2/jobs"
        self.domain = domain

    def fetch_raw_payload(self) -> Dict[str, Any]:
        """Fetches raw JSON from Eightfold AI API."""
        params = {
            "domain": self.domain,
            "start": 0,
            "num": self.limit,
            "query": self.query,
        }
        return self.http_get_json(self.api_url, params=params)

    def parse_postings(self, raw_payload: Dict[str, Any]) -> List[ExtractedPosting]:
        """Extracts normalized job postings from Eightfold JSON."""
        positions = raw_payload.get("positions") or raw_payload.get("jobs") or []
        extracted = []

        for item in positions:
            job_id = str(item.get("id") or item.get("position_id") or "").strip()
            title = (item.get("name") or item.get("title") or "").strip()
            if not job_id or not title:
                continue

            url = item.get("canonicalPositionUrl") or item.get("url") or f"{self.careers_url}#job/{job_id}"
            locations = item.get("locations") or []
            location = locations[0] if locations and isinstance(locations, list) else (item.get("location") or "Multiple Locations")
            team = item.get("department") or item.get("business_unit") or "Engineering"

            extracted.append(
                ExtractedPosting(
                    external_id=job_id,
                    title=title,
                    team=team,
                    location=str(location),
                    url=url,
                    deadline=None,
                    raw_json=item,
                )
            )

        return extracted
