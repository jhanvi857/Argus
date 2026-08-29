"""Rule-based relevance classifier for pre-filtering SWE/Infra intern postings."""
from typing import List, Optional, Tuple
import re
from pydantic import BaseModel

from src.adapters.models import ExtractedPosting
from src.db.models import Posting

# Level keywords (target: Interns, Summer Analysts, New Grads)
TARGET_LEVEL_KEYWORDS = [
    r"\bintern\b",
    r"\binternship\b",
    r"\bsummer\s+analyst\b",
    r"\bco-?op\b",
    r"\bnew\s+grad\b",
    r"\bgraduate\b",
    r"\bentry\s+level\b",
    r"\bundergrad\b",
    r"\b2026\b",
    r"\buniversity\b",
    r"\bcampus\b",
    r"\bstudent\b",
]

# Technical domain keywords (target: SWE, Backend, Infra, Systems, Quant)
TARGET_TECH_KEYWORDS = [
    r"\bsoftware\b",
    r"\bswe\b",
    r"\bsde\b",
    r"\bengineer\b",
    r"\bengineering\b",
    r"\bdeveloper\b",
    r"\bbackend\b",
    r"\binfrastructure\b",
    r"\binfra\b",
    r"\bdistributed\b",
    r"\bsystems\b",
    r"\bcloud\b",
    r"\bplatform\b",
    r"\bquantitative\b",
    r"\bquant\b",
    r"\bdata\s+engineer\b",
    r"\bsite\s+reliability\b",
    r"\bsre\b",
    r"\bcore\b",
    r"\btech\b",
    r"\btechnology\b",
]

# Disqualifying anti-keywords (seniority or non-technical domains)
ANTI_KEYWORDS = [
    r"\bsenior\b",
    r"\bsr\.?\b",
    r"\bstaff\b",
    r"\bprincipal\b",
    r"\blead\b",
    r"\bmanager\b",
    r"\bdirector\b",
    r"\bvp\b",
    r"\bhead\b",
    r"\barchitect\b",
    r"\bsales\b",
    r"\baccount\s+executive\b",
    r"\bmarketing\b",
    r"\bhuman\s+resources\b",
    r"\bhr\b",
    r"\brecruiter\b",
    r"\blegal\b",
    r"\btalent\b",
    r"\bbusiness\s+development\b",
    r"\bcustomer\s+support\b",
    r"\bfinance\b",
    r"\baccounting\b",
]


class ClassificationResult(BaseModel):
    """Result of role relevance classification."""

    relevant: bool
    confidence: float
    rationale: str


class RelevanceClassifier:
    """Classifies postings against target SWE/Infra intern preferences."""

    @classmethod
    def classify(
        cls,
        title: str,
        team: Optional[str] = None,
        location: Optional[str] = None,
        role_filter: Optional[List[str]] = None,
    ) -> ClassificationResult:
        """Determines if a posting is relevant for application alerts.

        Args:
            title: Job title string.
            team: Optional team/department name.
            location: Optional office/country location.
            role_filter: Optional company-specific whitelist filter strings.

        Returns:
            ClassificationResult containing boolean tag and explanation.
        """
        title_lower = title.lower()
        team_lower = (team or "").lower()
        full_text = f"{title_lower} {team_lower}"

        # 1. Check anti-keywords (immediate disqualification)
        for pattern in ANTI_KEYWORDS:
            if re.search(pattern, title_lower):
                matched = re.search(pattern, title_lower).group(0)
                return ClassificationResult(
                    relevant=False,
                    confidence=0.95,
                    rationale=f"Disqualified by anti-keyword '{matched}' in title",
                )

        # 2. Check company-specific role filter if present
        if role_filter:
            matches_all_filters = True
            missing_filters = []
            for rf in role_filter:
                rf_lower = rf.lower()
                if (
                    rf_lower not in title_lower
                    and rf_lower not in team_lower
                    and (not location or rf_lower not in location.lower())
                ):
                    matches_all_filters = False
                    missing_filters.append(rf)

            if not matches_all_filters:
                return ClassificationResult(
                    relevant=False,
                    confidence=0.85,
                    rationale=f"Missing company role filter requirements: {missing_filters}",
                )

        # 3. Check level target match (Intern, Summer Analyst, New Grad, etc.)
        matched_level = None
        for pattern in TARGET_LEVEL_KEYWORDS:
            m = re.search(pattern, full_text)
            if m:
                matched_level = m.group(0)
                break

        if not matched_level:
            return ClassificationResult(
                relevant=False,
                confidence=0.80,
                rationale="Does not match target early-career/intern levels",
            )

        # 4. Check domain target match (SWE, Infra, Backend, Distributed, Systems, etc.)
        matched_tech = None
        for pattern in TARGET_TECH_KEYWORDS:
            m = re.search(pattern, full_text)
            if m:
                matched_tech = m.group(0)
                break

        if not matched_tech:
            return ClassificationResult(
                relevant=False,
                confidence=0.75,
                rationale=f"Matches level ({matched_level}) but not target technical domain (SWE/Infra)",
            )

        return ClassificationResult(
            relevant=True,
            confidence=0.90,
            rationale=f"Target role match: Level='{matched_level}', Domain='{matched_tech}'",
        )


def classify_posting(
    posting: ExtractedPosting, role_filter: Optional[List[str]] = None
) -> ClassificationResult:
    """Convenience helper to classify an ExtractedPosting."""
    return RelevanceClassifier.classify(
        title=posting.title,
        team=posting.team,
        location=posting.location,
        role_filter=role_filter,
    )
