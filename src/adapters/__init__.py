"""ATS Adapters package for Argus."""
from .models import ExtractedPosting
from .base import BaseAdapter
from .greenhouse import GreenhouseAdapter
from .lever import LeverAdapter
from .workday import WorkdayAdapter
from .amazon import AmazonAdapter
from .google import GoogleAdapter
from .microsoft import MicrosoftAdapter
from .goldman import GoldmanSachsAdapter
from .eightfold import EightfoldAdapter
from .custom import CustomCareersAdapter
from .registry import get_adapter, register_adapter, ADAPTER_MAP

__all__ = [
    "ExtractedPosting",
    "BaseAdapter",
    "GreenhouseAdapter",
    "LeverAdapter",
    "WorkdayAdapter",
    "AmazonAdapter",
    "GoogleAdapter",
    "MicrosoftAdapter",
    "GoldmanSachsAdapter",
    "EightfoldAdapter",
    "CustomCareersAdapter",
    "get_adapter",
    "register_adapter",
    "ADAPTER_MAP",
]
