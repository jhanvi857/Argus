"""Typed state schema for the Ingestion LangGraph pipeline."""
from typing import TypedDict, Optional


class IngestionState(TypedDict):
    """State flowing through the ingestion graph nodes.

    Each new posting from the diff engine enters as a fresh IngestionState
    and flows through extract_fields → classify_relevance → dedupe.
    """

    # --- Input fields (set before graph entry) ---
    company_id: int
    company_name: str
    raw_posting: dict  # Raw JSON from ATS adapter (ExtractedPosting.raw_json)
    role_filter: list  # Company-specific role filter strings from config

    # --- Extracted posting metadata (set by extract_fields) ---
    external_id: Optional[str]
    title: Optional[str]
    team: Optional[str]
    location: Optional[str]
    deadline: Optional[str]
    url: Optional[str]

    # --- Classification results ---
    rule_based_result: Optional[dict]   # From existing RelevanceClassifier
    llm_classification: Optional[dict]  # From Groq LLM (if invoked)
    is_relevant: Optional[bool]         # Final relevance determination
    classification_rationale: Optional[str]

    # --- Dedup results ---
    is_duplicate: bool
    duplicate_of_posting_id: Optional[int]  # DB ID of the original posting

    # --- Graph metadata ---
    error: Optional[str]
    status: str  # "pending" | "processed" | "duplicate" | "irrelevant" | "error"
    db_manager: Optional[object]
