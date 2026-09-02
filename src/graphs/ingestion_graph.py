"""Ingestion LangGraph — extract_fields → classify_relevance → dedupe.

This graph runs automatically on every new raw posting produced by the diff
engine. It replaces the inline classify_posting() call in the ingestion
pipeline with a proper stateful graph that:

1. Normalizes raw ATS JSON into structured fields (extract_fields)
2. Runs two-stage relevance classification: rule-based pre-filter + Groq LLM (classify_relevance)
3. Fuzzy-matches against existing postings to catch reworded duplicates (dedupe)

Provider split rationale (from AGENTS.md):
- Groq for ingestion: runs every cron cycle across ~40 companies, simpler judgment,
  14,400 req/day free tier, fast inference
- Gemini reserved for Phase 6 matcher: low-volume, needs real reasoning
"""
import json
import logging
from typing import Optional, List, Dict, Any
from difflib import SequenceMatcher

from langgraph.graph import StateGraph, END

from src.classifier.relevance import RelevanceClassifier, ClassificationResult
from src.adapters.models import ExtractedPosting
from src.db.models import Company, Posting

from .ingestion_state import IngestionState
from .llm_classifier import classify_with_llm, LLMClassificationResult

logger = logging.getLogger(__name__)

# Fuzzy dedup thresholds
TITLE_SIMILARITY_THRESHOLD = 0.85
DEDUP_WINDOW_DAYS = 30

# Rule-based confidence threshold: if the rule-based classifier is this confident
# that a posting is irrelevant, skip the LLM call entirely
RULE_BASED_SKIP_LLM_CONFIDENCE = 0.90


# =============================================================================
# Node 1: extract_fields
# =============================================================================

def extract_fields(state: IngestionState) -> dict:
    """Normalizes raw ATS JSON into structured fields.

    Handles three JSON shapes:
    - Greenhouse: {title, location.name, departments[0].name, absolute_url, ...}
    - Lever: {text, categories.team, categories.location, hostedUrl, ...}
    - Generic: best-effort extraction from common field names

    This is plain Python — no LLM call.
    """
    raw = state.get("raw_posting", {})

    if not raw:
        return {
            "error": "Empty raw_posting — nothing to extract",
            "status": "error",
        }

    # Try to extract fields from common ATS JSON structures
    title = _extract_title(raw)
    team = _extract_team(raw)
    location = _extract_location(raw)
    deadline = _extract_deadline(raw)
    url = _extract_url(raw)
    external_id = _extract_external_id(raw)

    if not title:
        return {
            "error": f"Could not extract title from raw posting: {json.dumps(raw)[:200]}",
            "status": "error",
        }

    return {
        "external_id": external_id,
        "title": title,
        "team": team,
        "location": location,
        "deadline": deadline,
        "url": url,
        "status": "pending",
    }


def _extract_title(raw: dict) -> Optional[str]:
    """Extracts job title from raw JSON across ATS formats."""
    # Greenhouse: "title"
    # Lever: "text"
    # Generic fallbacks
    for key in ("title", "text", "job_title", "name", "position", "role"):
        val = raw.get(key)
        if val and isinstance(val, str):
            return val.strip()
    return None


def _extract_team(raw: dict) -> Optional[str]:
    """Extracts team/department from raw JSON."""
    # Greenhouse: departments[0].name
    departments = raw.get("departments", [])
    if departments and isinstance(departments, list):
        first = departments[0]
        if isinstance(first, dict):
            return first.get("name", "").strip() or None
        elif isinstance(first, str):
            return first.strip() or None

    # Lever: categories.team
    categories = raw.get("categories", {})
    if isinstance(categories, dict):
        team = categories.get("team")
        if team:
            return str(team).strip()

    # Generic fallbacks
    for key in ("team", "department", "group", "division", "org"):
        val = raw.get(key)
        if val and isinstance(val, str):
            return val.strip()

    return None


def _extract_location(raw: dict) -> Optional[str]:
    """Extracts location from raw JSON."""
    # Greenhouse: location.name
    loc_obj = raw.get("location")
    if isinstance(loc_obj, dict):
        return loc_obj.get("name", "").strip() or None
    elif isinstance(loc_obj, str):
        return loc_obj.strip() or None

    # Lever: categories.location
    categories = raw.get("categories", {})
    if isinstance(categories, dict):
        loc = categories.get("location")
        if loc:
            return str(loc).strip()

    # Generic
    for key in ("office", "city", "region", "country"):
        val = raw.get(key)
        if val and isinstance(val, str):
            return val.strip()

    return None


def _extract_deadline(raw: dict) -> Optional[str]:
    """Extracts application deadline from raw JSON."""
    for key in ("deadline", "close_date", "closing_date", "end_date", "expires_at"):
        val = raw.get(key)
        if val:
            return str(val).strip()
    return None


def _extract_url(raw: dict) -> Optional[str]:
    """Extracts posting URL from raw JSON."""
    for key in ("absolute_url", "hostedUrl", "url", "apply_url", "job_url", "link"):
        val = raw.get(key)
        if val and isinstance(val, str):
            return val.strip()
    return None


def _extract_external_id(raw: dict) -> Optional[str]:
    """Extracts external posting ID from raw JSON."""
    for key in ("id", "external_id", "job_id", "requisition_id", "req_id"):
        val = raw.get(key)
        if val is not None:
            return str(val).strip()
    return None


# =============================================================================
# Node 2: classify_relevance
# =============================================================================

def classify_relevance(state: IngestionState) -> dict:
    """Two-stage relevance classification: rule-based pre-filter + Groq LLM.

    Stage 1: Existing RelevanceClassifier (free, instant, deterministic).
    Stage 2 (conditional): Groq LLM for nuanced judgment — only invoked when:
      - Rule-based says relevant (confirm with LLM)
      - Rule-based is uncertain (confidence < RULE_BASED_SKIP_LLM_CONFIDENCE)

    Skipped entirely when rule-based is highly confident the posting is irrelevant
    (anti-keyword match, missing level keywords, etc.).
    """
    title = state.get("title", "")
    team = state.get("team")
    location = state.get("location")
    deadline = state.get("deadline")
    role_filter = state.get("role_filter", [])
    raw_posting = state.get("raw_posting", {})

    if not title:
        return {
            "is_relevant": False,
            "classification_rationale": "No title extracted — cannot classify",
            "rule_based_result": None,
            "llm_classification": None,
            "status": "irrelevant",
        }

    # --- Stage 1: Rule-based pre-filter ---
    rule_result: ClassificationResult = RelevanceClassifier.classify(
        title=title,
        team=team,
        location=location,
        role_filter=role_filter,
    )

    rule_dict = rule_result.model_dump()

    # Fast path: high-confidence irrelevant → skip LLM entirely
    if not rule_result.relevant and rule_result.confidence >= RULE_BASED_SKIP_LLM_CONFIDENCE:
        logger.debug(
            f"[{state.get('company_name')}] Rule-based REJECT (conf={rule_result.confidence:.2f}): "
            f"'{title}' — {rule_result.rationale}"
        )
        return {
            "is_relevant": False,
            "classification_rationale": f"Rule-based reject: {rule_result.rationale}",
            "rule_based_result": rule_dict,
            "llm_classification": None,
            "status": "irrelevant",
        }

    # --- Stage 2: LLM classification for uncertain or relevant postings ---
    raw_context = json.dumps(raw_posting, default=str)[:500] if raw_posting else None

    llm_result: LLMClassificationResult = classify_with_llm(
        title=title,
        team=team,
        location=location,
        deadline=deadline,
        raw_context=raw_context,
        role_filter=role_filter,
    )

    llm_dict = llm_result.model_dump()

    # Decision logic:
    # - If LLM returned a real result (confidence > 0), trust it
    # - If LLM fell back (confidence == 0), use rule-based result
    if llm_result.confidence > 0:
        is_relevant = llm_result.relevant
        rationale = f"LLM: {llm_result.rationale}"
    else:
        # LLM was unavailable — fall back to rule-based
        is_relevant = rule_result.relevant
        rationale = f"Rule-based (LLM fallback): {rule_result.rationale}"

    status = "pending" if is_relevant else "irrelevant"

    logger.info(
        f"[{state.get('company_name')}] Classification: relevant={is_relevant}, "
        f"'{title}' — {rationale}"
    )

    return {
        "is_relevant": is_relevant,
        "classification_rationale": rationale,
        "rule_based_result": rule_dict,
        "llm_classification": llm_dict,
        "status": status,
    }


# =============================================================================
# Node 3: dedupe
# =============================================================================

def dedupe(state: IngestionState) -> dict:
    """Fuzzy-matches against existing postings to catch reworded duplicates.

    Uses difflib.SequenceMatcher on title similarity within a 30-day window
    for the same company. This catches the "same req reworded" noise problem
    that external_id dedup alone can't solve.

    This node only runs for relevant postings (irrelevant ones skip it via
    conditional edge routing).
    """
    title = state.get("title", "")
    company_id = state.get("company_id")

    if not title or not company_id:
        return {
            "is_duplicate": False,
            "duplicate_of_posting_id": None,
            "status": "processed",
        }

    # Fetch recent postings for this company from DB
    try:
        db = state.get("db_manager")
        if not db:
            from src.db.db_manager import DatabaseManager
            db = DatabaseManager()

        recent_postings = db.find_similar_postings(
            company_id=company_id,
            days=DEDUP_WINDOW_DAYS,
        )
    except Exception as exc:
        logger.warning(f"Dedup DB lookup failed: {exc} — skipping dedup")
        return {
            "is_duplicate": False,
            "duplicate_of_posting_id": None,
            "status": "processed",
        }

    # Fuzzy match against each recent posting
    title_lower = title.lower().strip()
    for existing in recent_postings:
        existing_title = (existing.title or "").lower().strip()
        similarity = SequenceMatcher(None, title_lower, existing_title).ratio()

        if similarity >= TITLE_SIMILARITY_THRESHOLD:
            logger.info(
                f"[{state.get('company_name')}] DUPLICATE detected: "
                f"'{title}' ≈ '{existing.title}' (similarity={similarity:.3f}, "
                f"original_id={existing.id})"
            )
            return {
                "is_duplicate": True,
                "duplicate_of_posting_id": existing.id,
                "status": "duplicate",
            }

    return {
        "is_duplicate": False,
        "duplicate_of_posting_id": None,
        "status": "processed",
    }


# =============================================================================
# Conditional edge routing
# =============================================================================

def route_after_classify(state: IngestionState) -> str:
    """Routes after classification: relevant → dedupe, otherwise → END."""
    if state.get("status") == "error":
        return "end"
    if state.get("is_relevant"):
        return "dedupe"
    return "end"


# =============================================================================
# Graph wiring
# =============================================================================

def build_ingestion_graph() -> StateGraph:
    """Constructs and compiles the ingestion LangGraph.

    Flow:
        START → extract_fields → classify_relevance → route_after_classify
                                                          │
                                               ┌─────────┼──────────┐
                                            relevant   irrelevant   error
                                               │           │          │
                                             dedupe       END        END
                                               │
                                              END
    """
    graph = StateGraph(IngestionState)

    # Register nodes
    graph.add_node("extract_fields", extract_fields)
    graph.add_node("classify_relevance", classify_relevance)
    graph.add_node("dedupe", dedupe)

    # Linear edges
    graph.set_entry_point("extract_fields")
    graph.add_edge("extract_fields", "classify_relevance")

    # Conditional edge after classification
    graph.add_conditional_edges(
        "classify_relevance",
        route_after_classify,
        {
            "dedupe": "dedupe",
            "end": END,
        },
    )

    # Terminal edge
    graph.add_edge("dedupe", END)

    return graph


# Compiled graph instance — reused across invocations
ingestion_graph = build_ingestion_graph().compile()


# =============================================================================
# Public API
# =============================================================================

def process_new_posting(
    extracted_posting: ExtractedPosting,
    company: Company,
    role_filter: Optional[List[str]] = None,
    db_manager: Optional[Any] = None,
) -> IngestionState:
    """Runs a single new posting through the ingestion graph.

    This is the entry point called by IngestionPipeline after the diff engine
    identifies a genuinely new posting.

    Args:
        extracted_posting: Normalized posting from the ATS adapter.
        company: Company database record.
        role_filter: Company-specific role filter keywords.
        db_manager: Optional DatabaseManager instance for testing or persistence.

    Returns:
        Final IngestionState with classification and dedup results.
    """
    initial_state: IngestionState = {
        "company_id": company.id,
        "company_name": company.name,
        "raw_posting": extracted_posting.raw_json or {},
        "role_filter": role_filter or [],
        # Pre-populate from ExtractedPosting so extract_fields has fallbacks
        "external_id": extracted_posting.external_id,
        "title": extracted_posting.title,
        "team": extracted_posting.team,
        "location": extracted_posting.location,
        "deadline": str(extracted_posting.deadline) if extracted_posting.deadline else None,
        "url": extracted_posting.url,
        # Defaults
        "rule_based_result": None,
        "llm_classification": None,
        "is_relevant": None,
        "classification_rationale": None,
        "is_duplicate": False,
        "duplicate_of_posting_id": None,
        "error": None,
        "status": "pending",
        "db_manager": db_manager,
    }

    # Run the graph
    final_state = ingestion_graph.invoke(initial_state)
    return final_state
