"""Groq LLM integration for nuanced role relevance classification.

This module is used ONLY inside the classify_relevance node of the ingestion
LangGraph. The existing rule-based RelevanceClassifier acts as a fast pre-filter;
this LLM classifier handles the ambiguous cases that regex can't resolve.

Provider: Groq (llama-3.1-8b-instant) — chosen for ingestion because:
- High free-tier ceiling (14,400 req/day vs Gemini's 1,500)
- Fast inference latency
- Low-complexity judgment (relevant/not) doesn't need frontier reasoning
"""
import os
import logging
from typing import Optional, List
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Default model — fast, cheap, sufficient for binary classification
DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant"


class LLMClassificationResult(BaseModel):
    """Structured output from the Groq LLM classification call."""

    relevant: bool
    confidence: float = Field(ge=0.0, le=1.0, description="Classification confidence 0-1")
    rationale: str = Field(description="Short explanation for the classification decision")
    detected_level: Optional[str] = Field(
        default=None,
        description="Detected career level: intern, new-grad, entry-level, or None",
    )
    detected_domain: Optional[str] = Field(
        default=None,
        description="Detected technical domain: backend, infra, systems, swe, quant, or None",
    )


# Role preferences baked into the system prompt — these define what "relevant" means
ROLE_PREFERENCES = """
Target candidate profile:
- Career level: Intern, Summer Analyst, Co-op, New Grad, Entry Level (2025/2026)
- Technical domain: Software Engineering (SWE), Backend, Infrastructure, Distributed Systems,
  Cloud Platform, Site Reliability (SRE), Quantitative Development, Data Engineering
- NOT relevant: Senior/Staff/Lead/Principal roles, non-technical roles (sales, marketing, HR,
  legal, finance, recruiting, business development, customer support, accounting)
"""

CLASSIFICATION_PROMPT = """You are a job posting classifier for a software engineering candidate.

{role_preferences}

Company-specific role filter (ALL must match in title/team/location if present): {role_filter}

Analyze this job posting and classify whether it is RELEVANT for this candidate:

Title: {title}
Team: {team}
Location: {location}
Deadline: {deadline}
Additional context from raw posting: {raw_context}

Respond with a JSON object containing:
- "relevant": true/false
- "confidence": 0.0-1.0
- "rationale": brief explanation
- "detected_level": the career level you detected (intern/new-grad/entry-level/null)
- "detected_domain": the technical domain you detected (backend/infra/systems/swe/quant/null)
"""


def classify_with_llm(
    title: str,
    team: Optional[str] = None,
    location: Optional[str] = None,
    deadline: Optional[str] = None,
    raw_context: Optional[str] = None,
    role_filter: Optional[List[str]] = None,
) -> LLMClassificationResult:
    """Classifies a posting's relevance using Groq LLM.

    This function is designed to be called ONLY when the rule-based classifier
    is uncertain (confidence < 0.90) or returns relevant=True (for confirmation).
    It should never be called for high-confidence irrelevant postings.

    Args:
        title: Job title string.
        team: Team/department name.
        location: Office location.
        deadline: Application deadline.
        raw_context: Additional context extracted from raw JSON (first 500 chars).
        role_filter: Company-specific filter keywords.

    Returns:
        LLMClassificationResult with relevance judgment and rationale.

    Raises:
        No exception — returns a fallback result on any LLM error.
    """
    try:
        from langchain_groq import ChatGroq

        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            logger.warning("GROQ_API_KEY not set — falling back to rule-based only")
            return _fallback_result("GROQ_API_KEY not configured")

        model_name = os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL)
        llm = ChatGroq(
            model=model_name,
            api_key=groq_api_key,
            temperature=0.0,
            max_tokens=256,
            timeout=10,
        )

        # Use structured output for reliable parsing
        structured_llm = llm.with_structured_output(LLMClassificationResult)

        prompt = CLASSIFICATION_PROMPT.format(
            role_preferences=ROLE_PREFERENCES,
            role_filter=", ".join(role_filter) if role_filter else "None",
            title=title or "N/A",
            team=team or "N/A",
            location=location or "N/A",
            deadline=deadline or "N/A",
            raw_context=(raw_context or "N/A")[:500],
        )

        result = structured_llm.invoke(prompt)
        logger.info(
            f"LLM classification: relevant={result.relevant}, "
            f"confidence={result.confidence:.2f}, rationale='{result.rationale}'"
        )
        return result

    except ImportError:
        logger.error("langchain-groq not installed — pip install langchain-groq")
        return _fallback_result("langchain-groq not installed")

    except Exception as exc:
        # Graceful degradation: never block the pipeline on LLM failure
        logger.error(f"LLM classification failed: {exc}", exc_info=True)
        return _fallback_result(f"LLM error: {type(exc).__name__}: {exc}")


def _fallback_result(reason: str) -> LLMClassificationResult:
    """Returns a neutral fallback result when LLM is unavailable.

    Falls back to the rule-based result by returning relevant=False with
    low confidence, so the caller knows this wasn't a real LLM judgment.
    """
    return LLMClassificationResult(
        relevant=False,
        confidence=0.0,
        rationale=f"LLM unavailable ({reason}) — using rule-based result only",
        detected_level=None,
        detected_domain=None,
    )
