"""Microsoft official career portal adapter.

Hits Microsoft Careers search API (gcsservices.careers.microsoft.com/search/api/v1/search).
"""
from typing import Dict, Any, List, Optional
from .base import BaseAdapter
from .models import ExtractedPosting


class MicrosoftAdapter(BaseAdapter):
    """Adapter for official Microsoft Careers search JSON API."""

    DEFAULT_API_URL = "https://gcsservices.careers.microsoft.com/search/api/v1/search"

    def __init__(
        self,
        company_name: str = "Microsoft",
        careers_url: str = "https://careers.microsoft.com",
        ats_url: Optional[str] = None,
        query: str = "software intern",
        page_size: int = 50,
        **kwargs,
    ):
        super().__init__(company_name, careers_url, ats_url=ats_url, **kwargs)
        self.api_url = ats_url or self.DEFAULT_API_URL
        self.query = query
        self.page_size = page_size

    def fetch_raw_payload(self) -> Dict[str, Any]:
        """Fetches raw JSON from Microsoft Careers search API."""
        params = {
            "q": self.query,
            "pg": 1,
            "pgSz": self.page_size,
            "l": "en_us",
        }
        return self.http_get_json(self.api_url, params=params)

    def parse_postings(self, raw_payload: Dict[str, Any]) -> List[ExtractedPosting]:
        """Extracts normalized job postings from Microsoft Careers JSON."""
        op_result = raw_payload.get("operationResult") or {}
        result_data = op_result.get("result") or {}
        jobs = result_data.get("jobs") or raw_payload.get("jobs") or []
        extracted = []

        for item in jobs:
            job_id = str(item.get("jobId") or "").strip()
            title = (item.get("title") or "").strip()
            if not job_id or not title:
                continue

            url = f"https://jobs.careers.microsoft.com/global/en/job/{job_id}"

            props = item.get("properties") or {}
            location = props.get("primaryLocation") or "Multiple Locations"
            team = props.get("profession") or props.get("discipline") or "Software Engineering"

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
