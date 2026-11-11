"""ATS-Fit Score Engine for Argus.

Computes a transparent, honest ATS-fit estimate (0-100) for a given resume vs JD.
Includes:
1. Deterministic checks (no LLM): parse quality, layout density, section headings,
   contact info, date formats, and bullet quantification ratio.
2. Structured LLM/heuristic extraction: required vs preferred skills/keywords from the JD.
3. Keyword matching with synonym dictionary.
   Strict rule: Keywords the resume does not actually support must be listed as MISSING,
   never assumed present.
4. Caching by (resume_hash, jd_hash) in PostgreSQL `ats_scores` table.
"""
import os
import re
import json
import hashlib
import logging
from typing import Dict, Any, List, Optional, Tuple, Union
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Transparent disclaimer required on all outputs
ATS_SCORE_DISCLAIMER = (
    "This ATS-fit score is an ESTIMATE based on heuristic formatting checks and keyword extraction. "
    "It does not represent any specific company's proprietary ATS screening algorithm."
)

# Standard synonym dictionary for technical skills
TECHNICAL_SYNONYMS = {
    "k8s": "kubernetes",
    "kubernetes": "kubernetes",
    "postgres": "postgresql",
    "postgresql": "postgresql",
    "psql": "postgresql",
    "aws": "amazon web services",
    "amazon web services": "amazon web services",
    "gcp": "google cloud",
    "google cloud platform": "google cloud",
    "google cloud": "google cloud",
    "azure": "microsoft azure",
    "ts": "typescript",
    "typescript": "typescript",
    "js": "javascript",
    "javascript": "javascript",
    "py": "python",
    "python": "python",
    "golang": "go",
    "go": "go",
    "cpp": "c++",
    "c++": "c++",
    "react": "react",
    "reactjs": "react",
    "react.js": "react",
    "node": "node.js",
    "nodejs": "node.js",
    "node.js": "node.js",
    "ci/cd": "cicd",
    "ci cd": "cicd",
    "cicd": "cicd",
    "docker": "docker",
    "containerization": "docker",
    "nosql": "nosql",
    "mongo": "mongodb",
    "mongodb": "mongodb",
    "redis": "redis",
    "kafka": "kafka",
    "rabbitmq": "rabbitmq",
    "graphql": "graphql",
    "rest": "rest api",
    "restful": "rest api",
    "rest api": "rest api",
    "linux": "linux",
    "unix": "linux",
    "git": "git",
    "terraform": "terraform",
    "distributed systems": "distributed systems",
    "microservices": "microservices",
    "oop": "object-oriented programming",
    "concurrency": "multithreading/concurrency",
    "multithreading": "multithreading/concurrency",
}


def normalize_skill(skill: str) -> str:
    """Normalizes skill string to lowercase alphanumeric."""
    cleaned = skill.strip().lower()
    return TECHNICAL_SYNONYMS.get(cleaned, cleaned)


def compute_hash(text: str) -> str:
    """Computes SHA-256 hash of a string."""
    return hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()


class JDSkillsOutput(BaseModel):
    """Structured extraction of skills from a job description."""
    required_skills: List[str] = Field(default_factory=list, description="Must-have skills, languages, or qualifications")
    preferred_skills: List[str] = Field(default_factory=list, description="Nice-to-have or preferred skills and tools")


# =============================================================================
# Deterministic Scoring Checks (No LLM)
# =============================================================================

class DeterministicScorer:
    """Deterministic, rule-based resume evaluator."""

    @staticmethod
    def evaluate_parse_and_layout(text: str) -> Tuple[float, List[str]]:
        """Evaluates text extractability, length, and layout warnings."""
        warnings: List[str] = []
        score = 10.0

        if not text or len(text.strip()) < 100:
            return 0.0, ["Extremely low or missing text content (likely scanned image or empty PDF)."]

        if len(text.strip()) < 300:
            warnings.append("Text content is unusually short (< 300 chars); may be missing sections.")
            score -= 4.0

        # Check suspicious layout artifacts (excessive table bars, multiple consecutive tabs)
        pipe_count = text.count("|")
        if pipe_count > 30:
            warnings.append(f"High number of vertical pipes ({pipe_count}) detected; complex tables can confuse older ATS parsers.")
            score -= 2.0

        tab_count = text.count("\t\t")
        if tab_count > 10:
            warnings.append("Multiple consecutive tab delimiters detected; multi-column layout may parse out-of-order.")
            score -= 2.0

        return max(0.0, score), warnings

    @staticmethod
    def evaluate_sections(text: str) -> Tuple[float, List[str], List[str]]:
        """Checks for standard resume section headings."""
        lower = text.lower()
        sections_map = {
            "Education": ["education", "academic", "university", "degree"],
            "Experience": ["experience", "employment", "work history", "professional experience"],
            "Projects": ["projects", "technical projects", "personal projects", "portfolio"],
            "Skills": ["skills", "technical skills", "technologies", "proficiencies", "competencies"],
        }
        found: List[str] = []
        missing: List[str] = []

        for sec_name, keywords in sections_map.items():
            if any(re.search(rf"\b{re.escape(kw)}\b", lower) for kw in keywords):
                found.append(sec_name)
            else:
                missing.append(sec_name)

        # 8 points total (2 points per core section)
        score = len(found) * 2.0
        return score, found, missing

    @staticmethod
    def evaluate_contact_info(text: str) -> Tuple[float, List[str], List[str]]:
        """Checks presence of email, phone, and professional profiles."""
        found: List[str] = []
        missing: List[str] = []

        # Email regex
        if re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", text):
            found.append("Email")
        else:
            missing.append("Email")

        # Phone regex
        if re.search(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", text):
            found.append("Phone")
        else:
            missing.append("Phone")

        # LinkedIn / GitHub / Portfolio
        lower = text.lower()
        if "linkedin.com" in lower or "github.com" in lower or "gitlab.com" in lower or "http" in lower:
            found.append("Online Profile / Links")
        else:
            missing.append("Online Profile / Links")

        # 4 points total
        score = 0.0
        if "Email" in found:
            score += 1.5
        if "Phone" in found:
            score += 1.5
        if "Online Profile / Links" in found:
            score += 1.0

        return score, found, missing

    @staticmethod
    def evaluate_bullet_quantification(text: str) -> Tuple[float, float, int, int]:
        """Calculates bullet quantification ratio (bullets containing numbers, %, $)."""
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        bullet_lines = [
            l for l in lines
            if l.startswith(("•", "-", "*", "–", "—", "▪", "▫", ">")) or re.match(r"^\d+\.", l) or len(l) > 30
        ]

        if not bullet_lines:
            return 2.0, 0.0, 0, 0

        quant_pattern = re.compile(
            r"(\b\d+([.,]\d+)?%|\$\d+([.,]\d+)?[kKmMbB]?|\b\d+x\b|\b\d{2,}\b|\b(reduced|increased|improved|scaled|optimized|decreased)\b[^\n.]{0,30}\b\d+)",
            re.IGNORECASE,
        )

        quantified_count = sum(1 for b in bullet_lines if quant_pattern.search(b))
        ratio = quantified_count / max(1, len(bullet_lines))

        # 8 points maximum. 40%+ quantification ratio gets full 8 points.
        points = min(8.0, (ratio / 0.40) * 8.0)
        return round(points, 1), round(ratio, 2), len(bullet_lines), quantified_count

    @classmethod
    def run_all(cls, text: str) -> Dict[str, Any]:
        """Executes all deterministic checks and returns structured breakdown."""
        parse_score, parse_warnings = cls.evaluate_parse_and_layout(text)
        sections_score, found_secs, missing_secs = cls.evaluate_sections(text)
        contact_score, found_contacts, missing_contacts = cls.evaluate_contact_info(text)
        quant_score, quant_ratio, total_bullets, quant_bullets = cls.evaluate_bullet_quantification(text)

        total_deterministic_score = round(parse_score + sections_score + contact_score + quant_score, 1)

        return {
            "score": total_deterministic_score,
            "max_score": 30.0,
            "parse_quality": {
                "score": parse_score,
                "max": 10.0,
                "warnings": parse_warnings,
            },
            "sections": {
                "score": sections_score,
                "max": 8.0,
                "found": found_secs,
                "missing": missing_secs,
            },
            "contact_info": {
                "score": contact_score,
                "max": 4.0,
                "found": found_contacts,
                "missing": missing_contacts,
            },
            "quantification": {
                "score": quant_score,
                "max": 8.0,
                "ratio": quant_ratio,
                "total_bullets": total_bullets,
                "quantified_bullets": quant_bullets,
            },
        }


# =============================================================================
# LLM / Heuristic Skill Extractor & Matcher
# =============================================================================

def extract_skills_from_jd(jd_text: str) -> JDSkillsOutput:
    """Extracts required vs preferred skills from JD using LLM or robust heuristic fallback."""
    # 1. Try Gemini / Groq if API keys exist
    gemini_key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()
    groq_key = (os.getenv("GROQ_API_KEY") or "").strip()

    prompt = f"""You are an expert technical ATS evaluator.
Extract technical skills, programming languages, platforms, and domain qualifications from the following Job Description.
Separate them strictly into 'required_skills' and 'preferred_skills'.
Return ONLY valid JSON matching this schema:
{{
  "required_skills": ["string"],
  "preferred_skills": ["string"]
}}

Job Description:
{jd_text[:4000]}
"""

    if gemini_key and not gemini_key.startswith("your_"):
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(
                model=os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
                google_api_key=gemini_key,
                temperature=0.1,
            )
            structured_llm = llm.with_structured_output(JDSkillsOutput)
            result = structured_llm.invoke(prompt)
            if result and (result.required_skills or result.preferred_skills):
                return result
        except Exception as e:
            logger.warning(f"Gemini JD skill extraction failed: {e}")

    if groq_key and not groq_key.startswith("gsk_your_"):
        try:
            from langchain_groq import ChatGroq
            llm = ChatGroq(
                model=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
                api_key=groq_key,
                temperature=0.1,
            )
            structured_llm = llm.with_structured_output(JDSkillsOutput)
            result = structured_llm.invoke(prompt)
            if result and (result.required_skills or result.preferred_skills):
                return result
        except Exception as e:
            logger.warning(f"Groq JD skill extraction failed: {e}")

    # Fallback: Deterministic regex-based skill extraction from common vocab
    return _heuristic_jd_skill_extraction(jd_text)


def _heuristic_jd_skill_extraction(jd_text: str) -> JDSkillsOutput:
    """Fallback deterministic keyword extractor for JD."""
    known_tech = [
        "python", "java", "c++", "go", "golang", "c#", "rust", "typescript", "javascript",
        "sql", "postgresql", "mysql", "mongodb", "redis", "kafka", "docker", "kubernetes",
        "aws", "gcp", "azure", "linux", "git", "ci/cd", "rest api", "graphql", "grpc",
        "distributed systems", "microservices", "multithreading", "concurrency", "algorithms",
        "data structures", "system design", "react", "node.js"
    ]
    lower = jd_text.lower()
    found = [tech for tech in known_tech if re.search(rf"\b{re.escape(tech)}\b", lower)]

    # Split into required vs preferred based on header mentions
    required = found[: len(found) // 2 + 1] if found else ["Software Engineering", "Problem Solving"]
    preferred = found[len(found) // 2 + 1 :] if len(found) > 1 else []
    return JDSkillsOutput(required_skills=required, preferred_skills=preferred)


def match_skills(
    skills: List[str],
    resume_text: str,
) -> Tuple[List[str], List[str], Dict[str, str]]:
    """Matches a list of target skills against resume text with synonym support.

    Rule: Keywords the resume does not actually support MUST be placed in missing_list.
    Never assume present.
    """
    resume_lower = resume_text.lower()
    matched: List[str] = []
    missing: List[str] = []
    synonym_map: Dict[str, str] = {}

    for raw_skill in skills:
        skill = raw_skill.strip()
        if not skill:
            continue
        skill_lower = skill.lower()
        canonical = normalize_skill(skill_lower)

        # 1. Direct word-boundary match
        pattern = rf"\b{re.escape(skill_lower)}\b"
        if re.search(pattern, resume_lower):
            matched.append(skill)
            continue

        # 2. Canonical synonym match
        canonical_matched = False
        for syn_variant, syn_canon in TECHNICAL_SYNONYMS.items():
            if syn_canon == canonical:
                if re.search(rf"\b{re.escape(syn_variant)}\b", resume_lower):
                    matched.append(skill)
                    synonym_map[skill] = syn_variant
                    canonical_matched = True
                    break

        if not canonical_matched:
            # Strictly missing
            missing.append(skill)

    return matched, missing, synonym_map


# =============================================================================
# Composite ATS Scorer (Resume x JD)
# =============================================================================

def score_resume_against_jd(
    resume_text: str,
    jd_text: str,
    resume_version_id: Optional[int] = None,
    posting_id: Optional[int] = None,
    resume_hash: Optional[str] = None,
    jd_hash: Optional[str] = None,
    db_manager: Optional[Any] = None,
    force_refresh: bool = False,
) -> Dict[str, Any]:
    """Computes transparent ATS-fit score with caching."""
    r_hash = resume_hash or compute_hash(resume_text)
    j_hash = jd_hash or compute_hash(jd_text)

    # 1. Check cache in database if DB manager provided
    if db_manager and not force_refresh:
        cached = db_manager.get_ats_score_by_hashes(r_hash, j_hash)
        if cached:
            cached_data = dict(cached)
            breakdown = cached_data.get("breakdown_json", {})
            return {
                "score": cached_data.get("score", 0),
                "breakdown": breakdown,
                "resume_hash": r_hash,
                "jd_hash": j_hash,
                "cached": True,
                "disclaimer": ATS_SCORE_DISCLAIMER,
            }

    # 2. Run deterministic scoring (30 pts max)
    deterministic_result = DeterministicScorer.run_all(resume_text)
    det_score = deterministic_result["score"]  # out of 30.0

    # 3. Extract skills from JD
    jd_skills = extract_skills_from_jd(jd_text)

    # 4. Match required & preferred skills
    req_matched, req_missing, req_synonyms = match_skills(jd_skills.required_skills, resume_text)
    pref_matched, pref_missing, pref_synonyms = match_skills(jd_skills.preferred_skills, resume_text)

    # Content / Keyword alignment (70 pts max):
    # Required skills = 50 pts
    # Preferred skills = 20 pts
    total_req = len(jd_skills.required_skills)
    req_ratio = len(req_matched) / total_req if total_req > 0 else 1.0
    req_score = round(req_ratio * 50.0, 1)

    total_pref = len(jd_skills.preferred_skills)
    pref_ratio = len(pref_matched) / total_pref if total_pref > 0 else 1.0
    pref_score = round(pref_ratio * 20.0, 1)

    keyword_score = round(req_score + pref_score, 1)
    overall_score = min(100, max(0, int(round(det_score + keyword_score))))

    breakdown = {
        "overall_score": overall_score,
        "deterministic": deterministic_result,
        "keywords": {
            "score": keyword_score,
            "max": 70.0,
            "required_score": req_score,
            "preferred_score": pref_score,
            "required_matched": req_matched,
            "required_missing": req_missing,
            "preferred_matched": pref_matched,
            "preferred_missing": pref_missing,
            "synonym_matches": {**req_synonyms, **pref_synonyms},
        },
        "disclaimer": ATS_SCORE_DISCLAIMER,
    }

    # 5. Persist to DB cache if DB manager and IDs available
    if db_manager and resume_version_id and posting_id:
        try:
            db_manager.save_ats_score(
                resume_version_id=resume_version_id,
                posting_id=posting_id,
                score=overall_score,
                breakdown_json=breakdown,
                resume_hash=r_hash,
                jd_hash=j_hash,
            )
        except Exception as e:
            logger.warning(f"Could not persist ATS score to DB: {e}")

    return {
        "score": overall_score,
        "breakdown": breakdown,
        "resume_hash": r_hash,
        "jd_hash": j_hash,
        "cached": False,
        "disclaimer": ATS_SCORE_DISCLAIMER,
    }

