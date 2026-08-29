"""Adapter registry and factory for resolving ATS scrapers."""
from typing import Dict, Type, Optional
from .base import BaseAdapter
from .greenhouse import GreenhouseAdapter
from .lever import LeverAdapter

ADAPTER_MAP: Dict[str, Type[BaseAdapter]] = {
    "greenhouse": GreenhouseAdapter,
    "lever": LeverAdapter,
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
        # Check if URL hints at greenhouse or lever
        if ats_url and "greenhouse.io" in ats_url:
            adapter_cls = GreenhouseAdapter
        elif ats_url and "lever.co" in ats_url:
            adapter_cls = LeverAdapter
        elif "greenhouse.io" in careers_page_url:
            adapter_cls = GreenhouseAdapter
        elif "lever.co" in careers_page_url:
            adapter_cls = LeverAdapter
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
