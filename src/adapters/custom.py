"""Fallback and custom ATS adapter for companies with bespoke or pending endpoints."""
from typing import Dict, Any, List
import logging
from .base import BaseAdapter
from .models import ExtractedPosting

logger = logging.getLogger(__name__)


class CustomCareersAdapter(BaseAdapter):
    """Resilient adapter for companies with custom ATS or pending reverse-engineered endpoints."""

    def fetch_raw_payload(self) -> Dict[str, Any]:
        """Attempts to fetch careers JSON or returns placeholder."""
        target_url = self.ats_url or self.careers_url
        if not target_url:
            return {"company": self.company_name, "status": "no_url", "jobs": []}

        try:
            # If target URL points directly to an API or JSON endpoint
            if any(term in target_url.lower() for term in ("/api", ".json", "jobs/search", "search/jobs")):
                return self.http_get_json(target_url)
        except Exception as exc:
            logger.debug(f"[{self.company_name}] Custom endpoint fetch skipped/failed: {exc}")

        return {
            "company": self.company_name,
            "careers_url": self.careers_url,
            "status": "awaiting_custom_adapter",
            "jobs": [],
        }

    def parse_postings(self, raw_payload: Dict[str, Any]) -> List[ExtractedPosting]:
        """Parses postings if raw payload contains jobs array."""
        jobs_raw = raw_payload.get("jobs") or raw_payload.get("postings") or []
        if not isinstance(jobs_raw, list):
            return []

        postings: List[ExtractedPosting] = []
        for j in jobs_raw:
            if not isinstance(j, dict):
                continue
            title = j.get("title") or j.get("job_title") or j.get("name")
            if not title:
                continue
            ext_id = str(j.get("id") or j.get("requisition_id") or hash(title))
            url = j.get("url") or j.get("apply_url") or self.careers_url
            postings.append(
                ExtractedPosting(
                    external_id=ext_id,
                    title=str(title).strip(),
                    team=str(j.get("team") or j.get("department") or ""),
                    location=str(j.get("location") or ""),
                    url=str(url),
                    raw_json=j,
                )
            )
        return postings
