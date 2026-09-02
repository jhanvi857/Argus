"""Amazon official career portal adapter.

Hits Amazon's underlying search JSON API (amazon.jobs/en/search.json),
which the front-end itself calls when searching roles.
"""
from typing import Dict, Any, List, Optional
from .base import BaseAdapter
from .models import ExtractedPosting


class AmazonAdapter(BaseAdapter):
    """Adapter for official Amazon Jobs search JSON endpoint."""

    DEFAULT_API_URL = "https://www.amazon.jobs/en/search.json"

    def __init__(
        self,
        company_name: str = "Amazon",
        careers_url: str = "https://www.amazon.jobs",
        ats_url: Optional[str] = None,
        query: str = "software engineer intern",
        limit: int = 50,
        **kwargs,
    ):
        super().__init__(company_name, careers_url, ats_url=ats_url, **kwargs)
        self.api_url = ats_url or self.DEFAULT_API_URL
        self.query = query
        self.limit = limit

    def fetch_raw_payload(self) -> Dict[str, Any]:
        """Fetches raw JSON from Amazon Jobs search API."""
        params = {
            "base_query": self.query,
            "result_limit": self.limit,
            "sort": "recent",
        }
        return self.http_get_json(self.api_url, params=params)

    def parse_postings(self, raw_payload: Dict[str, Any]) -> List[ExtractedPosting]:
        """Extracts normalized job postings from Amazon Jobs JSON."""
        jobs = raw_payload.get("jobs") or []
        extracted = []

        for item in jobs:
            job_id = str(item.get("id_icims") or item.get("id") or "").strip()
            title = (item.get("title") or item.get("title_search") or "").strip()
            if not job_id or not title:
                continue

            # Build URL
            job_path = item.get("job_path") or f"/en/jobs/{job_id}"
            url = f"https://www.amazon.jobs{job_path}"

            city = item.get("city") or ""
            country = item.get("country_code") or ""
            location = f"{city}, {country}".strip(", ") if (city or country) else "Multiple Locations"

            team = item.get("business_category") or item.get("job_category") or "Software Development"

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
