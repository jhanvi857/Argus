"""Read-only Bullet Suggestion Engine for Argus.

Strict Ground Truth Rule:
Only rephrase/reorder bullets from the candidate's existing verified resume
or project portfolio (db/seed_projects.sql). NEVER invent experience, metrics,
or tools. Any suggested inclusion must be flagged with `confirmation_needed`.
"""
import os
import re
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class BulletSuggestion(BaseModel):
    """Structured suggested bullet rewrite grounded in candidate portfolio."""
    keyword: str = Field(description="Missing technical keyword being addressed")
    original_bullet: str = Field(description="Existing bullet point from candidate resume or portfolio")
    suggested_rewrite: str = Field(description="Rephrased bullet leading with existing metrics and surfacing the keyword")
    source_project: str = Field(description="Source project or resume section containing the ground truth")
    confirmation_needed: Optional[str] = Field(
        default=None,
        description="Explicit note flagging what the candidate must confirm before using"
    )


def generate_bullet_suggestions(
    missing_keywords: List[str],
    resume_text: str,
    projects: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """Generates read-only bullet rewrites for missing keywords using existing candidate experience as ground truth."""
    if not missing_keywords:
        return []

    # 1. Gather all existing bullets from candidate resume and projects
    resume_lines = [l.strip().lstrip("•-*–—▫ ").strip() for l in resume_text.split("\n") if len(l.strip()) > 35]
    
    portfolio_bullets = []
    if projects:
        for p in projects:
            p_name = p.get("name", "Project")
            for b in p.get("quantified_bullets", []):
                portfolio_bullets.append((p_name, b))

    suggestions: List[Dict[str, Any]] = []

    # Try LLM if configured
    gemini_key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()
    groq_key = (os.getenv("GROQ_API_KEY") or "").strip()

    candidate_evidence = "\n".join([f"- [{src}] {b}" for src, b in portfolio_bullets[:8]])
    if not candidate_evidence:
        candidate_evidence = "\n".join([f"- {b}" for b in resume_lines[:8]])

    if gemini_key and not gemini_key.startswith("your_"):
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(
                model=os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
                google_api_key=gemini_key,
                temperature=0.2,
            )
            class SuggestionsList(BaseModel):
                items: List[BulletSuggestion]

            structured_llm = llm.with_structured_output(SuggestionsList)
            prompt = f"""You are a strict technical resume advisor.
A candidate has missing keywords from a Job Description: {', '.join(missing_keywords[:6])}

GROUND TRUTH CANDIDATE EXPERIENCE:
{candidate_evidence}

RULES:
1. NEVER invent any skill, technology, company, or metric that is not in the ground truth above.
2. Only rephrase or reorder the existing ground truth bullets to highlight relevant architectural or systems aspects.
3. If integrating a related keyword (e.g. framing distributed consensus as relevant to high-availability), add an explicit 'confirmation_needed' warning (e.g. 'Confirmation needed: verify you configured this specific platform in production').
4. If no ground truth bullet relates to a missing keyword, DO NOT suggest a bullet for it.
"""
            res = structured_llm.invoke(prompt)
            if res and res.items:
                return [item.model_dump() for item in res.items]
        except Exception as e:
            logger.warning(f"LLM bullet suggestion generation failed: {e}")

    # Fallback deterministic suggestion generator
    for kw in missing_keywords[:4]:
        # Search portfolio bullets for related concepts
        kw_lower = kw.lower()
        matched_bullet = None
        source_name = "Portfolio Project"

        for p_name, b in portfolio_bullets:
            b_lower = b.lower()
            if any(w in b_lower for w in kw_lower.split()):
                matched_bullet = b
                source_name = p_name
                break

        if not matched_bullet and portfolio_bullets:
            source_name, matched_bullet = portfolio_bullets[len(suggestions) % len(portfolio_bullets)]
        elif not matched_bullet and resume_lines:
            matched_bullet = resume_lines[0]
            source_name = "Resume Experience"

        if matched_bullet:
            suggestions.append({
                "keyword": kw,
                "original_bullet": matched_bullet,
                "suggested_rewrite": f"Rephrased to emphasize {kw}: {matched_bullet}",
                "source_project": source_name,
                "confirmation_needed": f"Confirm you have direct hands-on proficiency with {kw} before adding this bullet.",
            })

    return suggestions

