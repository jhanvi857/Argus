"""Google official career portal adapter.

Hits Google Careers backend API (careers.google.com/api/v3/search/).
"""
from typing import Dict, Any, List, Optional
from .base import BaseAdapter
from .models import ExtractedPosting


class GoogleAdapter(BaseAdapter):
    """Adapter for official Google Careers search JSON API."""

    DEFAULT_API_URL = "https://careers.google.com/api/v3/search/"

    def __init__(
        self,
        company_name: str = "Google",
        careers_url: str = "https://careers.google.com",
        ats_url: Optional[str] = None,
        query: str = "software engineer intern",
        page_size: int = 50,
        **kwargs,
    ):
        super().__init__(company_name, careers_url, ats_url=ats_url, **kwargs)
        self.api_url = ats_url or self.DEFAULT_API_URL
        self.query = query
        self.page_size = page_size

    def fetch_raw_payload(self) -> Dict[str, Any]:
        """Fetches raw JSON from Google Careers API."""
        params = {
            "q": self.query,
            "page_size": self.page_size,
            "sort_by": "relevance",
        }
        return self.http_get_json(self.api_url, params=params)

    def parse_postings(self, raw_payload: Dict[str, Any]) -> List[ExtractedPosting]:
        """Extracts normalized job postings from Google Careers JSON."""
        jobs = raw_payload.get("jobs") or []
        extracted = []

        for item in jobs:
            job_id = str(item.get("id") or "").strip()
            title = (item.get("title") or "").strip()
            if not job_id or not title:
                continue

            url = f"https://careers.google.com/jobs/results/{job_id}/"

            # Parse location
            locations_list = item.get("locations") or []
            if locations_list and isinstance(locations_list, list):
                location = locations_list[0].get("display") or "Multiple Locations"
            else:
                location = "Multiple Locations"

            # Parse team
            categories = item.get("categories") or []
            team = categories[0] if categories and isinstance(categories, list) else "Software Engineering"

            extracted.append(
                ExtractedPosting(
                    external_id=job_id,
                    title=title,
                    team=team,
                    location=location,
                    url=url,
                    deadline=None,
                    raw_json=item,
                )
            )

        return extracted
