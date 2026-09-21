import os
import logging
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from src.pipeline.ingestion_service import run_all
from src.pipeline import notification_service
send_digest_notification = notification_service.send_digest_notification

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Argus Ingestion API",
    description="HTTP trigger and data orchestration service for Argus, n8n, and frontend.",
    version="1.0.0",
)

# Enable CORS for frontend Vite dev server (localhost:5173) and production containers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LATEST_TELEMETRY: Dict[str, Any] = {
    "companies_checked": 0,
    "successful_count": 0,
    "new_relevant_count": 0,
    "last_run_at": "Never",
    "is_running": False,
    "logs": [
        "System initialized.",
        "Argus Ingestion Pipeline ready.",
    ],
}


@app.on_event("startup")
def startup_db_init():
    """Initializes schema, seeds projects, and syncs companies on server startup."""
    from src.db.db_manager import DatabaseManager
    try:
        db = DatabaseManager()
        db.init_schema()
        db.seed_projects()
        db.sync_companies_from_config()
    except Exception as exc:
        # Standalone or initial container boot fallback
        pass


@app.get("/health")
def health():
    """Healthcheck endpoint for Docker container orchestration and frontend ping."""
    return {"status": "healthy"}


@app.post("/run-ingestion")
def trigger():
    """Triggers end-to-end ATS ingestion loop for all configured target companies."""
    global LATEST_TELEMETRY
    LATEST_TELEMETRY["is_running"] = True
    try:
        from src.db.db_manager import DatabaseManager
        db = DatabaseManager()
        
        result = run_all()
        successful = sum(1 for r in result if r.get("status") == "success")
        total_new_relevant = sum(r.get("relevant_postings", 0) for r in result if r.get("status") == "success")
        
        # Reclassify active postings against current candidate preferences
        reclass_stats = db.reclassify_all_postings()
        active_prefs = db.get_active_preferences()
        unnotified = db.get_unnotified_relevant_postings(preferences=active_prefs)
        
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        LATEST_TELEMETRY = {
            "companies_checked": len(result),
            "successful_count": successful,
            "new_relevant_count": total_new_relevant,
            "active_relevant_count": len(unnotified),
            "last_run_at": now_str,
            "is_running": False,
            "logs": [
                f"[{now_str}] Ingestion cycle completed successfully.",
                f"[{now_str}] Checked {len(result)} companies, {successful} healthy.",
                f"[{now_str}] Discovered {total_new_relevant} new relevant opportunities in this run.",
                f"[{now_str}] Evaluated preferences: {active_prefs.get('role_level', 'all')} in {active_prefs.get('locations', ['All'])} ({len(unnotified)} active opportunities).",
            ],
        }
        return {
            "status": "ok",
            "companies_checked": len(result),
            "successful_count": successful,
            "new_relevant_count": total_new_relevant,
            "active_relevant_count": len(unnotified),
            "reclassified": reclass_stats,
            "results": result,
        }
    except Exception as exc:
        LATEST_TELEMETRY["is_running"] = False
        LATEST_TELEMETRY["logs"].append(f"Ingestion error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


# =============================================================================
# Production Scheduled Digest Runner (/digest/run)
# =============================================================================

class DigestRunRequest(BaseModel):
    to_email: Optional[str] = None
    force_digest: bool = False


def _verify_cron_secret(authorization: Optional[str], x_cron_secret: Optional[str]):
    expected_secret = (os.getenv("CRON_SECRET") or os.getenv("ARGUS_CRON_SECRET") or "").strip()
    if not expected_secret:
        return
    token = ""
    if authorization:
        parts = authorization.split()
        token = parts[1] if len(parts) == 2 and parts[0].lower() == "bearer" else authorization.strip()
    elif x_cron_secret:
        token = x_cron_secret.strip()

    if token != expected_secret:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid cron secret")


@app.post("/digest/run")
@app.get("/digest/run")
def run_digest(
    req: Optional[DigestRunRequest] = None,
    authorization: Optional[str] = Header(None),
    x_cron_secret: Optional[str] = Header(None),
):
    """Production scheduled trigger endpoint.

    1. Executes IngestionPipeline for all target companies.
    2. Identifies new/updated postings from diff engine.
    3. Filters by user's role preferences.
    4. Formats and sends email digest via Resend with zero-duplicate guarantee.
    No n8n dependency required.
    """
    _verify_cron_secret(authorization, x_cron_secret)
    global LATEST_TELEMETRY
    LATEST_TELEMETRY["is_running"] = True
    try:
        from src.db.db_manager import DatabaseManager

        db = DatabaseManager()

        # 1. Run batch ingestion across all configured companies
        run_results = run_all()
        successful = sum(1 for r in run_results if r.get("status") == "success")
        total_new = sum(r.get("new_postings", 0) for r in run_results if r.get("status") == "success")
        total_new_relevant = sum(r.get("relevant_postings", 0) for r in run_results if r.get("status") == "success")

        # 2. Reclassify active postings against current candidate preferences
        db.reclassify_all_postings()

        # 3. Compile and dispatch Resend digest with atomic zero-duplicate claim
        to_email = req.to_email if req else None
        digest_res = notification_service.send_digest_notification(to_email=to_email, db_manager=db)

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        LATEST_TELEMETRY = {
            "companies_checked": len(run_results),
            "successful_count": successful,
            "new_relevant_count": total_new_relevant,
            "digest_sent_count": digest_res.get("count", 0),
            "last_run_at": now_str,
            "is_running": False,
            "logs": [
                f"[{now_str}] Production digest run completed successfully.",
                f"[{now_str}] Checked {len(run_results)} companies ({successful} successful).",
                f"[{now_str}] Discovered {total_new} new postings ({total_new_relevant} relevant).",
                f"[{now_str}] Digest status: {digest_res.get('message')}",
            ],
        }

        return {
            "status": "ok",
            "message": digest_res.get("message"),
            "companies_checked": len(run_results),
            "successful_count": successful,
            "new_postings_count": total_new,
            "new_relevant_count": total_new_relevant,
            "digest_sent": digest_res.get("count", 0) > 0,
            "digest_count": digest_res.get("count", 0),
            "notified_ids": digest_res.get("notified_ids", []),
            "resend_id": digest_res.get("resend_id"),
            "dev_mode": digest_res.get("dev_mode", False),
            "results": run_results,
        }
    except HTTPException:
        raise
    except Exception as exc:
        LATEST_TELEMETRY["is_running"] = False
        LATEST_TELEMETRY["logs"].append(f"Production digest error: {exc}")
        logger.error(f"Error executing /digest/run: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/telemetry")
def get_telemetry():
    """Returns the latest ATS ingestion telemetry metrics."""
    return LATEST_TELEMETRY


# =============================================================================
# Resend Email Digest Notification Endpoints
# =============================================================================

class DigestNotificationRequest(BaseModel):
    to_email: Optional[str] = None
    posting_ids: Optional[List[int]] = None


@app.post("/notifications/send-digest")
def trigger_digest_notification(req: Optional[DigestNotificationRequest] = None):
    """Dispatches an email digest of unnotified relevant opportunities via Resend."""
    to_email = req.to_email if req else None
    posting_ids = req.posting_ids if req else None
    result = notification_service.send_digest_notification(to_email=to_email, posting_ids=posting_ids)
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
    return result


@app.get("/notifications/stats")
def get_notification_statistics():
    """Returns notification status and count of pending alerts."""
    from src.db.db_manager import DatabaseManager
    db = DatabaseManager()
    try:
        return db.get_notification_stats()
    except Exception as exc:
        return {"error": str(exc)}



# =============================================================================
# Monitored Companies Endpoints
# =============================================================================

@app.get("/companies")
def list_companies():
    """Returns all monitored target companies with ATS metadata."""
    from src.db.db_manager import DatabaseManager
    from src.config.companies import load_companies_config

    catalog = load_companies_config()
    try:
        db = DatabaseManager()
        db_companies = db.get_all_companies()
        if len(db_companies) < catalog.total_count:
            db.sync_companies_from_config()
            db_companies = db.get_all_companies()
        if db_companies:
            return [c.model_dump() for c in db_companies]
    except Exception:
        pass

    # Fallback directly to YAML configuration catalog
    try:
        return [
            {
                "id": idx + 1,
                "name": c.name,
                "ats_type": c.ats_type,
                "careers_page_url": c.careers_page_url,
                "ats_url": c.ats_url,
                "is_healthy": True,
                "oa_platform": c.oa_platform,
                "hiring_process": c.hiring_process,
                "category": c.category,
            }
            for idx, c in enumerate(catalog.get_all_companies())
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load companies: {exc}")


# =============================================================================
# Phase 6: Matcher Endpoints (UI 'Interested' Trigger & Match Results)
# =============================================================================

@app.post("/postings/{posting_id}/interested")
def mark_interested(posting_id: int, force: bool = False):
    """Triggers Phase 6 Matcher LangGraph on UI 'Interested' click.

    Grounds recommendations strictly in the candidate's verified project portfolio.
    Returns the match recommendation, rationale, suggested keywords, and status.
    Caches results in PostgreSQL matches table so LLM is not re-invoked on every view.
    """
    from src.graphs.matcher_graph import process_match
    from src.db.db_manager import DatabaseManager

    db = DatabaseManager()

    # If already matched and not forced, return cached match directly (saving LLM quota)
    if not force:
        try:
            existing = db.get_match_by_posting_id(posting_id)
            if existing:
                return {
                    "posting_id": posting_id,
                    "status": "matched",
                    "match_result": {
                        "recommended_project_ids": existing.recommended_project_ids,
                        "rationale": existing.rationale,
                        "suggested_keywords": existing.suggested_keywords,
                    },
                    "validation_error": None,
                    "retry_count": 0,
                    "cached": True,
                }
        except Exception as e:
            logger.debug(f"Cache check bypass: {e}")

    final_state = process_match(posting_id=posting_id, db_manager=db)

    return {
        "posting_id": posting_id,
        "status": final_state.get("status", "pending"),
        "match_result": final_state.get("match_result"),
        "validation_error": final_state.get("validation_error"),
        "retry_count": final_state.get("retry_count", 0),
        "cached": False,
    }


@app.get("/postings/{posting_id}/match")
def get_match(posting_id: int):
    """Retrieves stored match recommendations for a given posting."""
    from src.db.db_manager import DatabaseManager

    db = DatabaseManager()
    match = db.get_match_by_posting_id(posting_id)
    if not match:
        raise HTTPException(status_code=404, detail=f"No match found for posting #{posting_id}")
    return match.model_dump()


@app.post("/companies/sync")
def sync_companies():
    """Syncs target companies from config/companies.yaml into Postgres."""
    from src.db.db_manager import DatabaseManager

    db = DatabaseManager()
    count = db.sync_companies_from_config()
    return {"status": "ok", "synced_count": count}


# =============================================================================
# Postings & Opportunities Endpoints
# =============================================================================

@app.get("/postings")
def list_postings(
    relevant_only: bool = True,
    status: Optional[str] = None,
    email: Optional[str] = None,
    role_level: Optional[str] = None,
    location: Optional[str] = None,
):
    """Retrieves postings joined with company details, filtered by candidate preferences."""
    from src.db.db_manager import DatabaseManager
    from src.classifier.relevance import RelevanceClassifier

    db = DatabaseManager()
    try:
        user_pref = {}
        if email:
            user_pref = db.get_user_preferences(email)
        if not user_pref:
            user_pref = db.get_active_preferences()

        query = """
            SELECT 
                p.id,
                p.company_id,
                p.external_id,
                p.title,
                p.team,
                p.deadline,
                p.url,
                p.first_seen_at,
                p.last_seen_at,
                p.status,
                p.relevant,
                p.notified_at,
                p.raw_json,
                c.name AS company_name,
                c.ats_type
            FROM postings p
            JOIN companies c ON p.company_id = c.id
            WHERE 1=1
        """
        params = []
        if relevant_only:
            query += " AND p.relevant = TRUE"
        if status:
            query += " AND p.status = %s"
            params.append(status)
        query += " ORDER BY p.first_seen_at DESC LIMIT 300;"

        with db.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                rows = cur.fetchall()
                results = []

                eff_role_level = role_level or user_pref.get("role_level") or "all"
                target_locations = [location] if location else user_pref.get("locations")
                target_company_ids = set(user_pref.get("target_company_ids") or [])

                for r in rows:
                    item = dict(r)
                    for date_field in ("first_seen_at", "last_seen_at", "deadline", "notified_at"):
                        if item.get(date_field):
                            item[date_field] = str(item[date_field])
                    raw = item.get("raw_json") or {}
                    raw_loc = raw.get("location")
                    if isinstance(raw_loc, dict):
                        item["location"] = raw_loc.get("name") or "Multiple Locations"
                    elif isinstance(raw_loc, str) and raw_loc.strip():
                        item["location"] = raw_loc.strip()
                    else:
                        item["location"] = "Multiple Locations"
                    item["required_skills"] = raw.get("required_skills") or []

                    if relevant_only:
                        if target_company_ids and item["company_id"] not in target_company_ids:
                            continue

                        # Test against location and career level
                        if target_locations and not RelevanceClassifier.matches_location(
                            f"{item['location']} {item.get('title', '')}", target_locations
                        ):
                            continue

                        level_clean = eff_role_level.lower().strip()
                        title_team = f"{item.get('title', '')} {item.get('team', '')}".lower()
                        if level_clean == "intern":
                            from src.classifier.relevance import INTERN_LEVEL_KEYWORDS
                            import re
                            if not any(re.search(p, title_team) for p in INTERN_LEVEL_KEYWORDS):
                                continue
                        elif level_clean == "new_grad":
                            from src.classifier.relevance import NEW_GRAD_LEVEL_KEYWORDS, INTERN_LEVEL_KEYWORDS
                            import re
                            is_ng = any(re.search(p, title_team) for p in NEW_GRAD_LEVEL_KEYWORDS)
                            is_int = any(re.search(p, title_team) for p in INTERN_LEVEL_KEYWORDS)
                            if not is_ng or is_int:
                                continue
                        elif level_clean == "experienced":
                            from src.classifier.relevance import EXPERIENCED_LEVEL_KEYWORDS, INTERN_LEVEL_KEYWORDS
                            import re
                            if any(re.search(p, title_team) for p in INTERN_LEVEL_KEYWORDS):
                                continue
                            if not any(re.search(p, title_team) for p in EXPERIENCED_LEVEL_KEYWORDS):
                                continue

                    results.append(item)
                return results
    except Exception as exc:
        logger.warning(f"Failed to fetch postings from DB: {exc}")
        return []


# =============================================================================
# Application Tracking Endpoints
# =============================================================================

class ApplicationUpdateRequest(BaseModel):
    stage: str
    notes: Optional[str] = None
    oa_date: Optional[str] = None
    referral_status: Optional[str] = None
    resume_version: Optional[str] = None


@app.get("/applications")
def list_applications():
    """Retrieves all tracked applications joined with postings and companies."""
    from src.db.db_manager import DatabaseManager

    db = DatabaseManager()
    try:
        query = """
            SELECT 
                a.id,
                a.posting_id,
                a.stage,
                a.oa_date,
                a.referral_status,
                a.resume_version,
                a.notes,
                a.updated_at,
                p.title,
                p.team,
                p.url,
                c.name AS company_name
            FROM applications a
            JOIN postings p ON a.posting_id = p.id
            JOIN companies c ON p.company_id = c.id
            ORDER BY a.updated_at DESC;
        """
        with db.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query)
                rows = cur.fetchall()
                results = []
                for r in rows:
                    item = dict(r)
                    if item.get("oa_date"):
                        item["oa_date"] = str(item["oa_date"])
                    if item.get("updated_at"):
                        item["updated_at"] = str(item["updated_at"])
                    results.append(item)
                return results
    except Exception as exc:
        return []


@app.post("/postings/{posting_id}/application")
def update_application(posting_id: int, req: ApplicationUpdateRequest):
    """Updates or creates application tracking status for a posting."""
    from src.db.db_manager import DatabaseManager

    db = DatabaseManager()
    try:
        updated = db.update_application_status(
            posting_id=posting_id,
            stage=req.stage,
            notes=req.notes,
            oa_date=req.oa_date,
            referral_status=req.referral_status,
            resume_version=req.resume_version,
        )
        return {"status": "ok", "application": updated}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# =============================================================================
# Auth & Email Verification Endpoints (OTP Verification -> DB Insert)
# =============================================================================

from typing import Optional
from pydantic import BaseModel
from fastapi import HTTPException


class SendOtpRequest(BaseModel):
    email: str
    full_name: str = "Candidate"


class VerifyOtpRequest(BaseModel):
    email: str
    otp_code: str


class LoginRequest(BaseModel):
    email: str
    password: Optional[str] = None


@app.post("/auth/send-otp")
def api_send_otp(req: SendOtpRequest):
    """Sends a 6-digit OTP verification code to the given email address via Resend."""
    from src.auth.email_verification import send_verification_otp

    res = send_verification_otp(email=req.email, full_name=req.full_name)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res


@app.post("/auth/verify-otp")
def api_verify_otp(req: VerifyOtpRequest):
    """Verifies OTP code and only after verification inserts the user into the database."""
    from src.auth.email_verification import verify_otp_and_register
    from src.db.db_manager import DatabaseManager

    db = DatabaseManager()
    res = verify_otp_and_register(email=req.email, otp_code=req.otp_code, db=db)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res


@app.post("/auth/login")
def api_login(req: LoginRequest):
    """Logs in a verified user. Rejects dummy or unverified emails not in the database."""
    from src.db.db_manager import DatabaseManager

    db = DatabaseManager()
    try:
        user = db.get_user_by_email(req.email)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")

    if not user:
        raise HTTPException(
            status_code=401,
            detail="No verified account found with this email. Please sign up and verify your email first via OTP.",
        )
    return {
        "status": "ok",
        "message": "Login successful",
        "user": user,
    }


@app.get("/auth/users")
def api_list_users():
    """Lists all verified users registered in the database."""
    from src.db.db_manager import DatabaseManager

    db = DatabaseManager()
    try:
        return db.get_all_users()
    except Exception as exc:
        return []


class PreferencesUpdateRequest(BaseModel):
    email: Optional[str] = None
    role_level: Optional[str] = "all"
    candidate_stage: Optional[str] = "College Student"
    candidate_stage_detail: Optional[str] = "Seeking internships & co-ops"
    target_roles: Optional[List[str]] = None
    locations: Optional[List[str]] = None
    preferred_roles: Optional[List[str]] = None
    focus_areas: Optional[List[str]] = None
    target_company_ids: Optional[List[int]] = None
    email_notifications_enabled: Optional[bool] = True
    notification_email: Optional[str] = None
    minimum_relevance: Optional[int] = 80
    posting_freshness_days: Optional[int] = 7
    delivery_frequency: Optional[str] = "Instant"
    last_updated_at: Optional[str] = None


@app.get("/auth/preferences")
def api_get_preferences(email: Optional[str] = None):
    """Fetches user preferences from Postgres."""
    from src.db.db_manager import DatabaseManager
    db = DatabaseManager()
    if email:
        return db.get_user_preferences(email)
    return db.get_active_preferences()


@app.post("/auth/preferences")
def api_save_preferences(req: PreferencesUpdateRequest):
    """Saves user preferences in Postgres."""
    from src.db.db_manager import DatabaseManager
    db = DatabaseManager()
    # Align target_roles with role_level if not explicitly provided
    resolved_target_roles = req.target_roles
    if not resolved_target_roles:
        if req.role_level == "intern":
            resolved_target_roles = ["Internships"]
        elif req.role_level == "new_grad":
            resolved_target_roles = ["New Grad"]
        elif req.role_level == "experienced":
            resolved_target_roles = ["Experienced"]
        else:
            resolved_target_roles = ["Internships", "New Grad"]

    pref_dict = {
        "role_level": req.role_level or "all",
        "candidate_stage": req.candidate_stage or "College Student",
        "candidate_stage_detail": req.candidate_stage_detail or "Seeking internships & co-ops",
        "target_roles": resolved_target_roles,
        "locations": req.locations if req.locations is not None else [],
        "preferred_roles": req.preferred_roles or [],
        "focus_areas": req.focus_areas or [],
        "target_company_ids": req.target_company_ids or [],
        "email_notifications_enabled": req.email_notifications_enabled if req.email_notifications_enabled is not None else True,
        "notification_email": req.notification_email or req.email,
        "minimum_relevance": req.minimum_relevance if req.minimum_relevance is not None else 80,
        "posting_freshness_days": req.posting_freshness_days if req.posting_freshness_days is not None else 7,
        "delivery_frequency": req.delivery_frequency or "Instant",
        "last_updated_at": req.last_updated_at or datetime.now(timezone.utc).strftime("%b %d, %Y · %H:%M"),
    }
    user_identifier = req.email or (req.notification_email if req.notification_email else "active")
    if user_identifier != "active":
        saved = db.save_user_preferences(user_identifier, pref_dict)
    else:
        users = db.get_all_users()
        if users:
            saved = db.save_user_preferences(users[0]["id"], pref_dict)
        else:
            saved = pref_dict

    # Immediately reclassify database postings under the updated user preferences
    try:
        db.reclassify_all_postings(saved)
    except Exception as reclass_err:
        logger.warning(f"Reclassification after preferences save: {reclass_err}")

    return {"status": "ok", "preferences": saved}


# =============================================================================
# Experience Sharing & Interview Prep Endpoints (Community + External)
# =============================================================================

class ExperienceLogRequest(BaseModel):
    stage: str
    posting_id: Optional[int] = None
    application_id: Optional[int] = None
    author_user_id: Optional[int] = None
    technical_questions: Optional[str] = None
    takeaways: Optional[str] = None
    offer_details: Optional[str] = None
    oa_date: Optional[str] = None
    interview_date: Optional[str] = None
    interview_round: Optional[str] = None
    visibility: str = "private"  # 'private' | 'shared'
    author_display_mode: str = "named"  # 'named' | 'anonymous'
    confidentiality_ack: bool = False
    log_id: Optional[int] = None


@app.get("/companies/{company_id}/experiences")
def get_company_experiences(company_id: int, stage: Optional[str] = None):
    """Returns merged, source-labeled community experiences and external prep resources for a company."""
    from src.db.db_manager import DatabaseManager

    db = DatabaseManager()
    try:
        return db.get_merged_experiences(company_id=company_id, stage_filter=stage)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch experiences: {exc}")


@app.post("/companies/{company_id}/experiences")
def save_company_experience(company_id: int, req: ExperienceLogRequest):
    """Saves or updates an interview experience log with sharing and confidentiality validation."""
    from src.db.db_manager import DatabaseManager

    if req.visibility == "shared" and not req.confidentiality_ack:
        raise HTTPException(
            status_code=400,
            detail="Sharing with community requires confirming that this does not violate any confidentiality agreement (NDA).",
        )

    db = DatabaseManager()
    try:
        saved = db.save_experience_log(
            company_id=company_id,
            stage=req.stage,
            posting_id=req.posting_id,
            application_id=req.application_id,
            author_user_id=req.author_user_id,
            technical_questions=req.technical_questions,
            takeaways=req.takeaways,
            offer_details=req.offer_details,
            oa_date=req.oa_date,
            interview_date=req.interview_date,
            interview_round=req.interview_round,
            visibility=req.visibility,
            author_display_mode=req.author_display_mode,
            confidentiality_ack=req.confidentiality_ack,
            log_id=req.log_id,
        )
        return {"status": "ok", "experience_log": saved}
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save experience log: {exc}")


@app.delete("/experiences/{log_id}")
def delete_company_experience(log_id: int, author_user_id: Optional[int] = None):
    """Deletes an experience log owned by the user."""
    from src.db.db_manager import DatabaseManager

    db = DatabaseManager()
    try:
        deleted = db.delete_experience_log(log_id=log_id, author_user_id=author_user_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Experience log not found or unauthorized.")
        return {"status": "ok", "message": "Experience log deleted."}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/companies/{company_id}/fetch-prep")
def fetch_company_external_prep(company_id: int):
    """Retrieves curated prep intelligence for the company from the curated knowledge base."""
    from src.pipeline.prep_service import get_curated_company_prep

    res = get_curated_company_prep(company_id=company_id)
    if res.get("status") == "not_found":
        raise HTTPException(status_code=404, detail=f"Company #{company_id} not found.")

    return {
        "status": "ok",
        "message": f"Loaded {res.get('count', 0)} curated prep debriefs.",
        "company_name": res.get("company_name"),
        "fetched_count": res.get("count", 0),
        "items": res.get("items", []),
    }



