"""Base adapter definition for ATS scraping and posting extraction."""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple
import logging
import time
import requests

from .models import ExtractedPosting

logger = logging.getLogger(__name__)

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
}


class BaseAdapter(ABC):
    """Abstract base class for all ATS adapters."""

    def __init__(
        self,
        company_name: str,
        careers_url: str,
        ats_url: Optional[str] = None,
        timeout: int = 15,
        max_retries: int = 3,
        backoff_factor: float = 1.5,
        session: Optional[requests.Session] = None,
        **kwargs,
    ):
        self.company_name = company_name
        self.careers_url = careers_url
        self.ats_url = ats_url
        self.timeout = timeout
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self.session = session or requests.Session()
        self.extra_kwargs = kwargs

    def get_headers(self) -> Dict[str, str]:
        """Returns request headers including realistic user agent."""
        return dict(DEFAULT_HEADERS)

    def http_get_json(self, url: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Performs HTTP GET with backoff retry and returns parsed JSON."""
        retries = 0
        current_delay = 1.0

        while retries <= self.max_retries:
            try:
                response = self.session.get(
                    url,
                    headers=self.get_headers(),
                    params=params,
                    timeout=self.timeout,
                )

                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", current_delay))
                    logger.warning(
                        f"[{self.company_name}] Rate limited (429). Retrying after {retry_after}s..."
                    )
                    time.sleep(retry_after)
                    retries += 1
                    current_delay *= self.backoff_factor
                    continue

                response.raise_for_status()
                parsed = response.json()
                if isinstance(parsed, list):
                    return {"jobs": parsed}
                return parsed

            except (requests.RequestException, ValueError) as exc:
                retries += 1
                if retries > self.max_retries:
                    logger.error(
                        f"[{self.company_name}] Failed GET {url} after {self.max_retries} attempts: {exc}"
                    )
                    raise
                logger.warning(
                    f"[{self.company_name}] Attempt {retries} failed ({exc}). Retrying in {current_delay}s..."
                )
                time.sleep(current_delay)
                current_delay *= self.backoff_factor

        raise RuntimeError(f"[{self.company_name}] Request failed after retries: {url}")

    @abstractmethod
    def fetch_raw_payload(self) -> Dict[str, Any]:
        """Fetches raw JSON payload from company ATS endpoint."""
        pass

    @abstractmethod
    def parse_postings(self, raw_payload: Dict[str, Any]) -> List[ExtractedPosting]:
        """Extracts normalized job postings from raw JSON payload."""
        pass

    def fetch_and_parse(self) -> Tuple[Dict[str, Any], List[ExtractedPosting]]:
        """Fetches raw payload and extracts postings in a single step."""
        raw_payload = self.fetch_raw_payload()
        postings = self.parse_postings(raw_payload)
        return raw_payload, postings
