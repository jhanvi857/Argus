"""Classifier package for Argus role relevance filtering."""
from .relevance import (
    RelevanceClassifier,
    ClassificationResult,
    classify_posting,
)

__all__ = [
    "RelevanceClassifier",
    "ClassificationResult",
    "classify_posting",
]
