"""ATS Adapters package for Argus."""
from .models import ExtractedPosting
from .base import BaseAdapter
from .greenhouse import GreenhouseAdapter
from .lever import LeverAdapter
from .registry import get_adapter, register_adapter, ADAPTER_MAP

__all__ = [
    "ExtractedPosting",
    "BaseAdapter",
    "GreenhouseAdapter",
    "LeverAdapter",
    "get_adapter",
    "register_adapter",
    "ADAPTER_MAP",
]
