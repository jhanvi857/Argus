"""Workday ATS adapter for enterprise companies (Salesforce, Walmart Global Tech, Wells Fargo).

Workday public career portals load postings dynamically via the CXS JSON endpoint:
  POST /wday/cxs/{tenant}/{client}/jobs
Hitting this internal API directly returns clean, unrendered structured JSON,
bypassing heavy JS rendering while retaining raw snapshots.
"""
from typing import Dict, Any, List, Optional
import re
from urllib.parse import urlparse

from .base import BaseAdapter
from .models import ExtractedPosting


class WorkdayAdapter(BaseAdapter):
    """Adapter for Workday CXS JSON job search endpoints."""

    def __init__(
        self,
        company_name: str,
        careers_url: str,
        ats_url: Optional[str] = None,
        tenant: Optional[str] = None,
        client_site: Optional[str] = None,
        search_query: str = "software",
        limit: int = 50,
        **kwargs,
    ):
        super().__init__(company_name, careers_url, ats_url=ats_url, **kwargs)
        self.tenant = tenant
        self.client_site = client_site
        self.search_query = search_query
        self.limit = limit
        self._resolve_endpoint()

    def _resolve_endpoint(self) -> None:
        """Derives the Workday CXS API endpoint and web base URL."""
        source_url = self.ats_url or self.careers_url

        # Check if tenant and client_site are already explicit
        if self.tenant and self.client_site:
            parsed = urlparse(source_url)
            self.base_domain = f"{parsed.scheme or 'https'}://{parsed.netloc}"
            self.api_endpoint = f"{self.base_domain}/wday/cxs/{self.tenant}/{self.client_site}/jobs"
            return

        # Attempt to parse from URL pattern: https://{host}/en-US/{client_site} or similar
        parsed = urlparse(source_url)
        host = parsed.netloc or "wd5.myworkdayjobs.com"
        self.base_domain = f"{parsed.scheme or 'https'}://{host}"

        # Standard company tenant heuristics
        company_slug = re.sub(r"[^a-zA-Z0-9]", "", self.company_name.lower())
        path_parts = [p for p in parsed.path.split("/") if p and p != "wday" and p != "cxs"]

        self.tenant = self.tenant or company_slug
        self.client_site = self.client_site or (path_parts[0] if path_parts else "Careers")

        if "/wday/cxs/" in source_url:
            self.api_endpoint = source_url
        else:
            self.api_endpoint = f"{self.base_domain}/wday/cxs/{self.tenant}/{self.client_site}/jobs"

    def fetch_raw_payload(self) -> Dict[str, Any]:
        """Fetches structured job postings from Workday CXS API."""
        payload = {
            "appliedFacets": {},
            "limit": self.limit,
            "offset": 0,
            "searchText": self.search_query,
        }
        return self.http_post_json(self.api_endpoint, json_payload=payload)

    def parse_postings(self, raw_payload: Dict[str, Any]) -> List[ExtractedPosting]:
        """Extracts normalized job postings from Workday JSON response."""
        job_postings = raw_payload.get("jobPostings") or []
        extracted = []

        for item in job_postings:
            external_path = item.get("externalPath") or ""
            # External ID usually follows /job/{ID}
            id_match = re.search(r"/job/([A-Za-z0-9_-]+)", external_path)
            external_id = id_match.group(1) if id_match else external_path.strip("/").split("/")[-1]

            title = (item.get("title") or "").strip()
            if not title or not external_id:
                continue

            # Build full career posting link
            url = f"{self.base_domain}/en-US/{self.tenant}/{self.client_site}{external_path}"

            # Extract location and team metadata
            location = item.get("locationsText") or "Remote / Multiple"
            team = "Software Engineering"
            bullet_fields = item.get("bulletFields") or []
            if bullet_fields:
                team = bullet_fields[0]

            extracted.append(
                ExtractedPosting(
                    external_id=external_id,
                    title=title,
                    team=str(team),
                    location=str(location),
                    url=url,
                    deadline=None,
                    raw_json=item,
                )
            )

        return extracted
