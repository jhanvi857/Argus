"""Rule-based relevance classifier for pre-filtering SWE/Infra intern and new-grad postings."""
from typing import List, Optional, Tuple
import re
from pydantic import BaseModel

from src.adapters.models import ExtractedPosting
from src.db.models import Posting

# Specific level keywords
INTERN_LEVEL_KEYWORDS = [
    r"\bintern\b",
    r"\binternship\b",
    r"\bsummer\s+analyst\b",
    r"\bco-?op\b",
    r"\bundergrad\b",
    r"\bstudent\b",
    r"\bcampus\b",
]

NEW_GRAD_LEVEL_KEYWORDS = [
    r"\bnew\s+grad\b",
    r"\bnew\s+graduate\b",
    r"\bgraduate\b",
    r"\bentry\s+level\b",
    r"\bcollege\s+grad\b",
    r"\buniversity\s+graduate\b",
    r"\bassociate\s+software\b",
    r"\bassociate\s+engineer\b",
    r"\brotational\b",
]

GENERAL_LEVEL_KEYWORDS = [
    r"\b2026\b",
    r"\b2025\b",
    r"\buniversity\b",
]

EXPERIENCED_LEVEL_KEYWORDS = [
    r"\bsoftware\s+engineer\b",
    r"\bbackend\s+engineer\b",
    r"\binfrastructure\s+engineer\b",
    r"\bsystems\s+engineer\b",
    r"\bsde\b",
    r"\bsde\s*[1-2iI]+\b",
    r"\bengineer\s*[1-2iI]+\b",
    r"\bsoftware\s+development\s+engineer\b",
    r"\bfull\s*stack\b",
    r"\bdeveloper\b",
]

TARGET_LEVEL_KEYWORDS = INTERN_LEVEL_KEYWORDS + NEW_GRAD_LEVEL_KEYWORDS + GENERAL_LEVEL_KEYWORDS


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

# Global Country / Region Aliases and City Keyword Mapping for precision location filtering
GLOBAL_LOCATION_MAP = {
    "united states": ["united states", "usa", "us", "u.s.", "san francisco", "new york", "seattle", "chicago", "austin", "sunnyvale", "mountain view", "menlo park", "cupertino", "palo alto", "cambridge, ma", "boston", "california", "texas", "washington", "berkeley", "los angeles", "redmond", "new york city", "nyc", "sf bay", "remote, us"],
    "india": ["india", "bengaluru", "bangalore", "hyderabad", "gurugram", "gurgaon", "noida", "pune", "mumbai", "delhi", "chennai", "kolkata", "ahmedabad"],
    "united kingdom": ["united kingdom", "uk", "u.k.", "london", "england", "cambridge", "edinburgh", "oxford", "manchester", "bristol", "birmingham"],
    "ireland": ["ireland", "dublin", "cork", "galway"],
    "germany": ["germany", "berlin", "munich", "frankfurt", "hamburg", "stuttgart", "walldorf", "cologne"],
    "switzerland": ["switzerland", "zurich", "geneva", "lausanne", "basel"],
    "canada": ["canada", "toronto", "vancouver", "waterloo", "montreal", "ottawa", "calgary"],
    "singapore": ["singapore"],
    "netherlands": ["netherlands", "amsterdam", "rotterdam", "utrecht", "eindhoven", "the hague"],
    "france": ["france", "paris", "lyon", "toulouse", "grenoble"],
    "australia": ["australia", "sydney", "melbourne", "brisbane", "canberra", "perth"],
    "japan": ["japan", "tokyo", "osaka", "kyoto"],
    "poland": ["poland", "warsaw", "krakow", "wroclaw", "gdansk"],
    "israel": ["israel", "tel aviv", "haifa", "herzliya", "jerusalem"],
    "united arab emirates": ["united arab emirates", "uae", "u.a.e.", "dubai", "abu dhabi"],
    "sweden": ["sweden", "stockholm", "gothenburg", "malmo"],
    "spain": ["spain", "madrid", "barcelona", "valencia"],
    "italy": ["italy", "milan", "rome", "turin"],
    "denmark": ["denmark", "copenhagen", "aarhus"],
    "norway": ["norway", "oslo", "bergen"],
    "finland": ["finland", "helsinki", "espoo"],
    "austria": ["austria", "vienna", "graz"],
    "belgium": ["belgium", "brussels", "antwerp", "ghent"],
    "czech republic": ["czech republic", "czechia", "prague", "brno"],
    "romania": ["romania", "bucharest", "cluj", "timisoara"],
    "portugal": ["portugal", "lisbon", "porto"],
    "brazil": ["brazil", "sao paulo", "rio de janeiro"],
    "mexico": ["mexico", "mexico city", "guadalajara", "monterrey"],
    "south korea": ["south korea", "korea", "seoul"],
    "china": ["china", "beijing", "shanghai", "shenzhen", "hangzhou"],
    "taiwan": ["taiwan", "taipei", "hsinchu"],
    "hong kong": ["hong kong"],
    "new zealand": ["new zealand", "auckland", "wellington"],
    "remote": ["remote", "virtual", "work from home", "anywhere", "telecommute"]
}


class ClassificationResult(BaseModel):
    """Result of role relevance classification."""

    relevant: bool
    confidence: float
    rationale: str


class RelevanceClassifier:
    """Classifies postings against target SWE/Infra intern & new-grad preferences."""

    @classmethod
    def matches_location(cls, location_text: str, target_locations: List[str]) -> bool:
        """Checks if a location string matches any of the target locations or their aliases."""
        if not target_locations or any(t.lower() in ("all", "all global locations", "any") for t in target_locations):
            return True

        norm_text = (location_text or "").lower().strip()
        if not norm_text:
            return False

        for target in target_locations:
            target_norm = target.lower().strip()
            if not target_norm:
                continue
            # Direct text match
            if target_norm in norm_text:
                return True
            
            # Check mapped country keywords & cities
            for country_key, keywords in GLOBAL_LOCATION_MAP.items():
                if country_key in target_norm or target_norm in country_key:
                    if any(
                        (re.search(rf"\b{re.escape(k)}\b", norm_text) if len(k) <= 3 else k in norm_text)
                        for k in keywords
                    ):
                        return True

        return False

    @classmethod
    def classify(
        cls,
        title: str,
        team: Optional[str] = None,
        location: Optional[str] = None,
        role_filter: Optional[List[str]] = None,
        role_level: str = "all",
        target_locations: Optional[List[str]] = None,
    ) -> ClassificationResult:
        """Determines if a posting is relevant for application alerts.

        Args:
            title: Job title string.
            team: Optional team/department name.
            location: Optional office/country location.
            role_filter: Optional company-specific whitelist filter strings.
            role_level: Target role level ('all', 'intern', 'new_grad').
            target_locations: Optional list of country/region filters.

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

        # 3. Check target location filter if specified by user preferences
        if target_locations and not cls.matches_location(f"{location or ''} {title_lower}", target_locations):
            return ClassificationResult(
                relevant=False,
                confidence=0.90,
                rationale=f"Location '{location or 'Unspecified'}' does not match target locations: {target_locations}",
            )

        # 4. Check level target match according to role_level preference ('intern', 'new_grad', 'all')
        matched_intern = any(re.search(p, full_text) for p in INTERN_LEVEL_KEYWORDS)
        matched_new_grad = any(re.search(p, full_text) for p in NEW_GRAD_LEVEL_KEYWORDS)
        matched_general = any(re.search(p, full_text) for p in GENERAL_LEVEL_KEYWORDS)

        role_level_clean = (role_level or "all").lower().strip()

        if role_level_clean == "intern":
            # Strictly intern only
            if matched_new_grad and not matched_intern:
                return ClassificationResult(
                    relevant=False,
                    confidence=0.90,
                    rationale="Role is New Grad but user preference is Intern only",
                )
            if not matched_intern and not matched_general:
                return ClassificationResult(
                    relevant=False,
                    confidence=0.85,
                    rationale="Does not match target intern/co-op keywords",
                )
            matched_level = "Intern"

        elif role_level_clean == "new_grad":
            # Strictly new grad only
            if matched_intern and not matched_new_grad:
                return ClassificationResult(
                    relevant=False,
                    confidence=0.90,
                    rationale="Role is Internship but user preference is New Grad only",
                )
            if not matched_new_grad and not matched_general:
                return ClassificationResult(
                    relevant=False,
                    confidence=0.85,
                    rationale="Does not match target new grad / entry-level keywords",
                )
            matched_level = "New Grad"

        elif role_level_clean == "experienced":
            # Strictly experienced / industry SWE roles (reject student internships)
            if matched_intern:
                return ClassificationResult(
                    relevant=False,
                    confidence=0.90,
                    rationale="Role is Internship/Student but user preference is Experienced / In Industry",
                )
            matched_exp = any(re.search(p, full_text) for p in EXPERIENCED_LEVEL_KEYWORDS)
            matched_any_tech = any(re.search(p, full_text) for p in TARGET_TECH_KEYWORDS)
            if not matched_exp and not matched_any_tech:
                return ClassificationResult(
                    relevant=False,
                    confidence=0.85,
                    rationale="Does not match target Software Engineer / SDE roles",
                )
            matched_level = "Experienced/Industry"

        else:
            # All early career roles
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

        # 5. Check domain target match (SWE, Infra, Backend, Distributed, Systems, etc.)
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
    posting: ExtractedPosting,
    role_filter: Optional[List[str]] = None,
    role_level: str = "all",
    target_locations: Optional[List[str]] = None,
) -> ClassificationResult:
    """Convenience helper to classify an ExtractedPosting."""
    return RelevanceClassifier.classify(
        title=posting.title,
        team=posting.team,
        location=posting.location,
        role_filter=role_filter,
        role_level=role_level,
        target_locations=target_locations,
    )
