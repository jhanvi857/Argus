from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from src.pipeline.ingestion_service import run_all

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
        result = run_all()
        successful = sum(1 for r in result if r.get("status") == "success")
        total_new_relevant = sum(r.get("relevant_postings", 0) for r in result if r.get("status") == "success")
        
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        LATEST_TELEMETRY = {
            "companies_checked": len(result),
            "successful_count": successful,
            "new_relevant_count": total_new_relevant,
            "last_run_at": now_str,
            "is_running": False,
            "logs": [
                f"[{now_str}] Ingestion cycle completed successfully.",
                f"[{now_str}] Checked {len(result)} companies, {successful} healthy.",
                f"[{now_str}] Detected {total_new_relevant} new relevant opportunities.",
            ],
        }
        return {
            "status": "ok",
            "companies_checked": len(result),
            "successful_count": successful,
            "new_relevant_count": total_new_relevant,
            "results": result,
        }
    except Exception as exc:
        LATEST_TELEMETRY["is_running"] = False
        LATEST_TELEMETRY["logs"].append(f"Ingestion error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/telemetry")
def get_telemetry():
    """Returns the latest ATS ingestion telemetry metrics."""
    return LATEST_TELEMETRY


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
def mark_interested(posting_id: int):
    """Triggers Phase 6 Matcher LangGraph on UI 'Interested' click.

    Grounds recommendations strictly in the candidate's verified project portfolio.
    Returns the match recommendation, rationale, suggested keywords, and status.
    """
    from src.graphs.matcher_graph import process_match
    from src.db.db_manager import DatabaseManager

    db = DatabaseManager()
    final_state = process_match(posting_id=posting_id, db_manager=db)

    return {
        "posting_id": posting_id,
        "status": final_state.get("status", "pending"),
        "match_result": final_state.get("match_result"),
        "validation_error": final_state.get("validation_error"),
        "retry_count": final_state.get("retry_count", 0),
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
def list_postings(relevant_only: bool = True, status: Optional[str] = None):
    """Retrieves postings joined with company details."""
    from src.db.db_manager import DatabaseManager

    db = DatabaseManager()
    try:
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
        query += " ORDER BY p.first_seen_at DESC LIMIT 100;"

        with db.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                rows = cur.fetchall()
                # Format dates to string
                results = []
                for r in rows:
                    item = dict(r)
                    for date_field in ("first_seen_at", "last_seen_at", "deadline", "notified_at"):
                        if item.get(date_field):
                            item[date_field] = str(item[date_field])
                    results.append(item)
                return results
    except Exception as exc:
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
    """Sends a 6-digit OTP verification code to the given email address via SMTP."""
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
