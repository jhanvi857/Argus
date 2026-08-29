"""Lever ATS Adapter for Argus."""
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import re

from .base import BaseAdapter
from .models import ExtractedPosting


class LeverAdapter(BaseAdapter):
    """Adapter for companies using Lever ATS (api.lever.co/v0/postings/{site})."""

    def __init__(
        self,
        company_name: str,
        careers_url: str,
        ats_url: Optional[str] = None,
        site_token: Optional[str] = None,
        **kwargs,
    ):
        super().__init__(company_name, careers_url, ats_url, **kwargs)
        self.site_token = site_token or self._extract_site_token()

    def _extract_site_token(self) -> str:
        """Derives Lever site token from ats_url or careers_url or company name."""
        if self.ats_url:
            match = re.search(r"api\.lever\.co/v0/postings/([^/?]+)", self.ats_url)
            if match:
                return match.group(1)
            match = re.search(r"jobs\.lever\.co/([^/?]+)", self.ats_url)
            if match:
                return match.group(1)

        if self.careers_url:
            match = re.search(r"jobs\.lever\.co/([^/?]+)", self.careers_url)
            if match:
                return match.group(1)

        return re.sub(r"[^a-zA-Z0-9_-]", "", self.company_name.lower())

    def get_api_endpoint(self) -> str:
        """Returns the Lever jobs API endpoint URL."""
        if self.ats_url and "api.lever.co" in self.ats_url:
            return self.ats_url
        return f"https://api.lever.co/v0/postings/{self.site_token}?mode=json"

    def fetch_raw_payload(self) -> Dict[str, Any]:
        """Fetches all active jobs from Lever."""
        endpoint = self.get_api_endpoint()
        return self.http_get_json(endpoint)

    def parse_postings(self, raw_payload: Dict[str, Any]) -> List[ExtractedPosting]:
        """Parses Lever raw JSON payload into normalized ExtractedPosting instances."""
        jobs = raw_payload.get("jobs", []) if "jobs" in raw_payload else raw_payload
        if isinstance(jobs, dict):
            # In case lever wrapped in dict
            jobs = jobs.get("postings", jobs.get("jobs", []))

        postings: List[ExtractedPosting] = []
        for job in jobs:
            if not isinstance(job, dict):
                continue

            external_id = str(job.get("id", "")).strip()
            title = str(job.get("text", "")).strip()
            url = str(job.get("hostedUrl", job.get("applyUrl", ""))).strip()

            if not external_id or not title:
                continue

            categories = job.get("categories", {})
            team = categories.get("team") or categories.get("department") if isinstance(categories, dict) else None
            location = categories.get("location") if isinstance(categories, dict) else None

            deadline = None
            created_at_ts = job.get("createdAt")
            if created_at_ts and isinstance(created_at_ts, (int, float)):
                try:
                    deadline = datetime.fromtimestamp(created_at_ts / 1000.0, tz=timezone.utc)
                except Exception:
                    pass

            postings.append(
                ExtractedPosting(
                    external_id=external_id,
                    title=title,
                    url=url or f"https://jobs.lever.co/{self.site_token}/{external_id}",
                    team=team,
                    location=location,
                    deadline=deadline,
                    raw_json=job,
                )
            )

        return postings
