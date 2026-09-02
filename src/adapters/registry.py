"""Adapter registry and factory for resolving ATS scrapers."""
from typing import Dict, Type, Optional
from .base import BaseAdapter
from .greenhouse import GreenhouseAdapter
from .lever import LeverAdapter
from .workday import WorkdayAdapter
from .amazon import AmazonAdapter
from .google import GoogleAdapter
from .microsoft import MicrosoftAdapter
from .goldman import GoldmanSachsAdapter
from .eightfold import EightfoldAdapter

ADAPTER_MAP: Dict[str, Type[BaseAdapter]] = {
    "greenhouse": GreenhouseAdapter,
    "lever": LeverAdapter,
    "workday": WorkdayAdapter,
    "amazon": AmazonAdapter,
    "google": GoogleAdapter,
    "microsoft": MicrosoftAdapter,
    "goldman": GoldmanSachsAdapter,
    "goldman_sachs": GoldmanSachsAdapter,
    "eightfold": EightfoldAdapter,
}


def register_adapter(ats_type: str, adapter_cls: Type[BaseAdapter]) -> None:
    """Registers a new ATS adapter class for a given ats_type key."""
    ADAPTER_MAP[ats_type.strip().lower()] = adapter_cls


def get_adapter(
    company_name: str,
    careers_page_url: str,
    ats_type: str = "greenhouse",
    ats_url: Optional[str] = None,
    **kwargs,
) -> BaseAdapter:
    """Instantiates the appropriate adapter for the given company and ATS configuration."""
    clean_type = ats_type.strip().lower()
    adapter_cls = ADAPTER_MAP.get(clean_type)

    if not adapter_cls:
        # Check company name and URLs to resolve reverse-engineered adapters
        name_lower = company_name.lower()
        url_combined = f"{careers_page_url} {ats_url or ''}".lower()

        if "greenhouse.io" in url_combined:
            adapter_cls = GreenhouseAdapter
        elif "lever.co" in url_combined:
            adapter_cls = LeverAdapter
        elif "workday" in url_combined or "myworkdayjobs" in url_combined or any(c in name_lower for c in ("salesforce", "walmart", "wells fargo")):
            adapter_cls = WorkdayAdapter
        elif "amazon" in name_lower or "amazon.jobs" in url_combined:
            adapter_cls = AmazonAdapter
        elif "google" in name_lower or "careers.google.com" in url_combined:
            adapter_cls = GoogleAdapter
        elif "microsoft" in name_lower or "careers.microsoft.com" in url_combined:
            adapter_cls = MicrosoftAdapter
        elif "goldman" in name_lower:
            adapter_cls = GoldmanSachsAdapter
        elif "eightfold.ai" in url_combined or "american express" in name_lower or "paypal" in name_lower:
            adapter_cls = EightfoldAdapter
        else:
            raise ValueError(
                f"No adapter registered for ats_type '{ats_type}' (Company: {company_name}). "
                f"Available adapters: {list(ADAPTER_MAP.keys())}"
            )

    return adapter_cls(
        company_name=company_name,
        careers_url=careers_page_url,
        ats_url=ats_url,
        **kwargs,
    )
