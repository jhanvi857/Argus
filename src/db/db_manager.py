"""Database connection and lifecycle manager for Argus."""
import os
import sys
from pathlib import Path
from typing import List, Optional, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor, Json
from dotenv import load_dotenv

from .models import (
    Project,
    Company,
    Posting,
    Match,
    Application,
    Snapshot,
    ExperienceLog,
    PrepResource,
    MergedExperienceItem,
)

# Load environment variables
load_dotenv()

DEFAULT_DB_URL = "postgresql://postgres:postgres@localhost:5432/argus"
SCHEMA_PATH = Path(__file__).resolve().parent.parent.parent / "db" / "schema.sql"
SEED_PATH = Path(__file__).resolve().parent.parent.parent / "db" / "seed_projects.sql"


class DatabaseManager:
    """Manages PostgreSQL connection and operations for Argus."""

    def __init__(self, database_url: Optional[str] = None):
        self.database_url = (
            database_url
            or os.getenv("DATABASE_URL")
            or f"postgresql://{os.getenv('POSTGRES_USER', 'postgres')}:{os.getenv('POSTGRES_PASSWORD', 'postgres')}@{os.getenv('POSTGRES_HOST', 'localhost')}:{os.getenv('POSTGRES_PORT', '5432')}/{os.getenv('POSTGRES_DB', 'argus')}"
        )

    def get_connection(self):
        """Creates and returns a connection to PostgreSQL."""
        return psycopg2.connect(self.database_url, connect_timeout=3)

    def init_schema(self, schema_file: Optional[Path] = None) -> bool:
        """Executes the DDL schema file to create all tables and indexes."""
        file_path = schema_file or SCHEMA_PATH
        if not file_path.exists():
            raise FileNotFoundError(f"Schema file not found at {file_path}")

        sql = file_path.read_text(encoding="utf-8")
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
            conn.commit()
        return True

    def seed_projects(self, seed_file: Optional[Path] = None) -> int:
        """Executes seed_projects.sql to insert or update candidate projects."""
        file_path = seed_file or SEED_PATH
        if not file_path.exists():
            raise FileNotFoundError(f"Seed file not found at {file_path}")

        sql = file_path.read_text(encoding="utf-8")
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                cur.execute("SELECT COUNT(*) FROM projects;")
                count = cur.fetchone()[0]
            conn.commit()
        return count

    def get_all_projects(self) -> List[Project]:
        """Retrieves all candidate projects from the database."""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM projects ORDER BY id;")
                rows = cur.fetchall()
                return [Project(**dict(r)) for r in rows]

    def get_project_by_id(self, project_id: str) -> Optional[Project]:
        """Retrieves a single project by its slug ID."""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM projects WHERE id = %s;", (project_id,))
                row = cur.fetchone()
                return Project(**dict(row)) if row else None

    def get_valid_project_ids(self) -> List[str]:
        """Returns the fixed list of all valid project IDs (hallucination guardrail)."""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM projects ORDER BY id;")
                return [r[0] for r in cur.fetchall()]

    def sync_companies_from_config(self, config_path: Optional[Path] = None) -> int:
        """Syncs target companies from YAML configuration into the companies table."""
        from src.config.companies import load_companies_config
        catalog = load_companies_config(config_path)
        companies = catalog.get_all_companies()
        if not companies:
            return 0

        with self.get_connection() as conn:
            with conn.cursor() as cur:
                for comp in companies:
                    cur.execute(
                        """
                        INSERT INTO companies (name, ats_type, ats_url, careers_page_url, updated_at)
                        VALUES (%s, %s, %s, %s, NOW())
                        ON CONFLICT (name) DO UPDATE
                        SET ats_type = EXCLUDED.ats_type,
                            ats_url = COALESCE(EXCLUDED.ats_url, companies.ats_url),
                            careers_page_url = EXCLUDED.careers_page_url,
                            updated_at = NOW();
                        """,
                        (comp.name, comp.ats_type, comp.ats_url, comp.careers_page_url),
                    )
                cur.execute("SELECT COUNT(*) FROM companies;")
                count = cur.fetchone()[0]
            conn.commit()
        return count

    def get_all_companies(self) -> List[Company]:
        """Retrieves all monitored companies from the database."""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM companies ORDER BY name;")
                rows = cur.fetchall()
                return [Company(**dict(r)) for r in rows]

    def get_company_by_name(self, name: str) -> Optional[Company]:
        """Retrieves a single company by name."""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM companies WHERE LOWER(name) = LOWER(%s);", (name.strip(),))
                row = cur.fetchone()
                return Company(**dict(row)) if row else None

    def get_company_by_id(self, company_id: int) -> Optional[Company]:
        """Retrieves a single company by database ID."""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM companies WHERE id = %s;", (company_id,))
                row = cur.fetchone()
                return Company(**dict(row)) if row else None

    def create_snapshot(self, company_id: int, raw_payload: Dict[str, Any]) -> int:
        """Stores a raw scrape payload snapshot for a company."""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO snapshots (company_id, raw_payload, fetched_at)
                    VALUES (%s, %s, NOW())
                    RETURNING id;
                    """,
                    (company_id, Json(raw_payload)),
                )
                snapshot_id = cur.fetchone()[0]
            conn.commit()
        return snapshot_id

    def get_latest_snapshot(self, company_id: int) -> Optional[Snapshot]:
        """Retrieves the most recent snapshot for a company."""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM snapshots WHERE company_id = %s ORDER BY fetched_at DESC LIMIT 1;",
                    (company_id,),
                )
                row = cur.fetchone()
                return Snapshot(**dict(row)) if row else None

    def get_postings_for_company(self, company_id: int) -> List[Posting]:
        """Retrieves all stored postings for a company."""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM postings WHERE company_id = %s ORDER BY first_seen_at DESC;",
                    (company_id,),
                )
                rows = cur.fetchall()
                return [Posting(**dict(r)) for r in rows]

    def insert_new_postings(
        self, company_id: int, postings: List[Any], relevant_flags: Optional[List[bool]] = None
    ) -> List[int]:
        """Inserts genuinely new postings into the postings table."""
        if not postings:
            return []

        inserted_ids: List[int] = []
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                for idx, p in enumerate(postings):
                    raw_json = getattr(p, "raw_json", None) or {}
                    rel = None
                    if relevant_flags is not None and idx < len(relevant_flags):
                        rel = relevant_flags[idx]
                    elif hasattr(p, "relevant") and p.relevant is not None:
                        rel = p.relevant

                    cur.execute(
                        """
                        INSERT INTO postings (
                            company_id, external_id, title, team, deadline, url,
                            raw_json, status, relevant, notified_at, first_seen_at, last_seen_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, 'new', %s, NULL, NOW(), NOW())
                        ON CONFLICT (company_id, external_id) DO NOTHING
                        RETURNING id;
                        """,
                        (
                            company_id,
                            p.external_id,
                            p.title,
                            p.team,
                            p.deadline,
                            p.url,
                            Json(raw_json),
                            rel,
                        ),
                    )
                    row = cur.fetchone()
                    if row:
                        inserted_ids.append(row[0])
            conn.commit()
        return inserted_ids

    def update_postings_last_seen(self, company_id: int, external_ids: List[str]) -> None:
        """Updates last_seen_at timestamp for a batch of existing postings."""
        if not external_ids:
            return

        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE postings
                    SET last_seen_at = NOW(),
                        updated_at = NOW()
                    WHERE company_id = %s AND external_id = ANY(%s);
                    """,
                    (company_id, external_ids),
                )
            conn.commit()

    def update_posting(self, company_id: int, posting: Any) -> None:
        """Updates title, team, url, and raw_json for an updated posting."""
        raw_json = getattr(posting, "raw_json", None) or {}
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE postings
                    SET title = %s,
                        team = %s,
                        url = %s,
                        deadline = %s,
                        raw_json = %s,
                        last_seen_at = NOW(),
                        updated_at = NOW()
                    WHERE company_id = %s AND external_id = %s;
                    """,
                    (
                        posting.title,
                        posting.team,
                        posting.url,
                        posting.deadline,
                        Json(raw_json),
                        company_id,
                        posting.external_id,
                    ),
                )
            conn.commit()

    def mark_postings_closed(self, company_id: int, external_ids: List[str]) -> int:
        """Marks postings as closed when removed from latest ATS scrape."""
        if not external_ids:
            return 0

        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE postings
                    SET status = 'closed',
                        updated_at = NOW()
                    WHERE company_id = %s 
                      AND external_id = ANY(%s)
                      AND status IN ('new', 'reviewed');
                    """,
                    (company_id, external_ids),
                )
                affected = cur.rowcount
            conn.commit()
        return affected

    def update_company_last_checked(self, company_id: int) -> None:
        """Updates last_checked_at timestamp for a company."""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE companies SET last_checked_at = NOW(), updated_at = NOW() WHERE id = %s;",
                    (company_id,),
                )
            conn.commit()

    def find_similar_postings(
        self, company_id: int, days: int = 30
    ) -> List[Posting]:
        """Retrieves recent postings for a company within a time window.

        Used by the dedupe node in the ingestion LangGraph to fuzzy-match
        new posting titles against existing ones, catching the "same req
        reworded" problem that exact external_id dedup can't solve.

        Args:
            company_id: Target company database ID.
            days: Lookback window in days (default 30).

        Returns:
            List of Posting records within the time window.
        """
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT * FROM postings
                    WHERE company_id = %s
                      AND first_seen_at >= NOW() - INTERVAL '%s days'
                      AND status != 'closed'
                    ORDER BY first_seen_at DESC;
                    """,
                    (company_id, days),
                )
                rows = cur.fetchall()
                return [Posting(**dict(r)) for r in rows]


    def get_unnotified_relevant_postings(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Retrieves all relevant, unnotified postings joined with company details."""
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
                p.raw_json,
                p.status,
                p.relevant,
                p.notified_at,
                c.name AS company_name,
                c.ats_type,
                c.careers_page_url
            FROM postings p
            JOIN companies c ON p.company_id = c.id
            WHERE p.relevant = TRUE 
              AND p.notified_at IS NULL 
              AND p.status != 'closed'
            ORDER BY p.first_seen_at ASC
        """
        params = []
        if limit and limit > 0:
            query += " LIMIT %s"
            params.append(limit)

        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                rows = cur.fetchall()
                return [dict(r) for r in rows]

    def mark_postings_notified(self, posting_ids: List[int]) -> int:
        """Marks a batch of posting IDs as notified (setting notified_at = NOW())."""
        if not posting_ids:
            return 0

        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE postings
                    SET notified_at = NOW(),
                        updated_at = NOW()
                    WHERE id = ANY(%s) AND notified_at IS NULL;
                    """,
                    (posting_ids,),
                )
                affected = cur.rowcount
            conn.commit()
        return affected

    def get_notification_stats(self) -> Dict[str, int]:
        """Returns aggregate metrics on postings, relevance, and notification status."""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT 
                        COUNT(*) AS total_postings,
                        COUNT(*) FILTER (WHERE relevant = TRUE) AS relevant_postings,
                        COUNT(*) FILTER (WHERE relevant = TRUE AND notified_at IS NOT NULL) AS notified_postings,
                        COUNT(*) FILTER (WHERE relevant = TRUE AND notified_at IS NULL AND status != 'closed') AS pending_notifications
                    FROM postings;
                    """
                )
                row = cur.fetchone()
                return {
                    "total_postings": row[0] or 0,
                    "relevant_postings": row[1] or 0,
                    "notified_postings": row[2] or 0,
                    "pending_notifications": row[3] or 0,
                }

    def get_posting_by_id(self, posting_id: int) -> Optional[Posting]:
        """Retrieves a single posting by its primary key ID."""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM postings WHERE id = %s;", (posting_id,))
                row = cur.fetchone()
                return Posting(**dict(row)) if row else None

    def save_match(
        self,
        posting_id: int,
        recommended_project_ids: List[str],
        rationale: str,
        suggested_keywords: Optional[List[str]] = None,
    ) -> int:
        """Stores a portfolio match result for a posting into the matches table."""
        keywords = suggested_keywords or []
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO matches (posting_id, recommended_project_ids, rationale, suggested_keywords, created_at)
                    VALUES (%s, %s, %s, %s, NOW())
                    RETURNING id;
                    """,
                    (posting_id, recommended_project_ids, rationale, keywords),
                )
                match_id = cur.fetchone()[0]
            conn.commit()
        return match_id

    def get_match_by_posting_id(self, posting_id: int) -> Optional[Match]:
        """Retrieves the latest portfolio match result for a posting."""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM matches WHERE posting_id = %s ORDER BY created_at DESC LIMIT 1;",
                    (posting_id,),
                )
                row = cur.fetchone()
                return Match(**dict(row)) if row else None

    def update_posting_status(self, posting_id: int, status: str) -> None:
        """Updates the status of a posting (e.g. reviewed, applied, ignored, closed)."""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE postings SET status = %s, updated_at = NOW() WHERE id = %s;",
                    (status, posting_id),
                )
            conn.commit()

    def update_application_status(
        self,
        posting_id: int,
        stage: str,
        notes: Optional[str] = None,
        oa_date: Optional[str] = None,
        referral_status: Optional[str] = "none",
        resume_version: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Upserts an application tracking record for a job posting."""
        clean_stage = stage.lower()
        clean_referral = (referral_status or "none").lower()
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    INSERT INTO applications (posting_id, stage, notes, oa_date, referral_status, resume_version, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (posting_id) DO UPDATE
                    SET stage = EXCLUDED.stage,
                        notes = COALESCE(EXCLUDED.notes, applications.notes),
                        oa_date = COALESCE(EXCLUDED.oa_date, applications.oa_date),
                        referral_status = COALESCE(EXCLUDED.referral_status, applications.referral_status),
                        resume_version = COALESCE(EXCLUDED.resume_version, applications.resume_version),
                        updated_at = NOW()
                    RETURNING id, posting_id, stage, notes, oa_date, referral_status, resume_version, updated_at;
                    """,
                    (posting_id, clean_stage, notes, oa_date if oa_date else None, clean_referral, resume_version),
                )
                row = cur.fetchone()
                if clean_stage in ("applied", "oa", "technical_interview", "offer"):
                    cur.execute("UPDATE postings SET status = 'applied', updated_at = NOW() WHERE id = %s;", (posting_id,))
                elif clean_stage in ("rejected", "withdrawn"):
                    cur.execute("UPDATE postings SET status = 'closed', updated_at = NOW() WHERE id = %s;", (posting_id,))
            conn.commit()
        return dict(row) if row else {}

    def create_user(self, name: str, email: str) -> Dict[str, Any]:
        """Inserts or activates a verified user in the users table after successful OTP verification."""
        clean_email = email.strip().lower()
        clean_name = name.strip()
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    INSERT INTO users (name, email, is_active, created_at, updated_at)
                    VALUES (%s, %s, TRUE, NOW(), NOW())
                    ON CONFLICT (email) DO UPDATE
                    SET name = EXCLUDED.name,
                        is_active = TRUE,
                        updated_at = NOW()
                    RETURNING id, name, email, is_active, created_at;
                    """,
                    (clean_name, clean_email),
                )
                row = cur.fetchone()
            conn.commit()
        return dict(row)

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Retrieves a user from the database by email address."""
        clean_email = email.strip().lower()
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT id, name, email, is_active, created_at FROM users WHERE LOWER(email) = %s AND is_active = TRUE;",
                    (clean_email,),
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def get_all_users(self) -> List[Dict[str, Any]]:
        """Retrieves all registered and active users."""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT id, name, email, is_active, created_at FROM users WHERE is_active = TRUE ORDER BY id;")
                rows = cur.fetchall()
                return [dict(r) for r in rows]

    def get_pending_by_company(self, company: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieves pending postings and in-flight applications for a company or all companies.

        Answers questions like 'what's pending for Goldman Sachs' directly from the database.
        """
        query = """
            SELECT 
                p.id AS posting_id,
                c.name AS company_name,
                p.title,
                p.team,
                p.url,
                p.status AS posting_status,
                p.relevant,
                p.first_seen_at,
                a.id AS application_id,
                a.stage AS application_stage,
                a.oa_date,
                a.referral_status,
                a.resume_version,
                a.notes
            FROM postings p
            JOIN companies c ON p.company_id = c.id
            LEFT JOIN applications a ON p.id = a.posting_id
            WHERE (p.status IN ('new', 'reviewed') OR (a.stage IS NOT NULL AND a.stage NOT IN ('rejected', 'offer_accepted', 'withdrawn')))
        """
        params = []
        if company:
            query += " AND LOWER(c.name) LIKE LOWER(%s)"
            params.append(f"%{company.strip()}%")
        query += " ORDER BY p.first_seen_at DESC LIMIT 50;"

        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                return [dict(r) for r in cur.fetchall()]

    def get_recent_postings(self, days: int = 7, company: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieves genuine postings detected within the last N days."""
        query = """
            SELECT 
                p.id AS posting_id,
                c.name AS company_name,
                p.title,
                p.team,
                p.url,
                p.status,
                p.relevant,
                p.first_seen_at,
                p.last_seen_at
            FROM postings p
            JOIN companies c ON p.company_id = c.id
            WHERE p.first_seen_at >= NOW() - INTERVAL '%s day'
        """
        params = [days]
        if company:
            query += " AND LOWER(c.name) LIKE LOWER(%s)"
            params.append(f"%{company.strip()}%")
        query += " ORDER BY p.first_seen_at DESC LIMIT 100;"

        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                return [dict(r) for r in cur.fetchall()]

    def update_application_status(
        self,
        posting_id: int,
        stage: str,
        notes: Optional[str] = None,
        oa_date: Optional[str] = None,
        referral_status: Optional[str] = None,
        resume_version: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates or updates application tracking details for a posting."""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    INSERT INTO applications (posting_id, stage, notes, oa_date, referral_status, resume_version, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (posting_id) DO UPDATE
                    SET stage = EXCLUDED.stage,
                        notes = COALESCE(EXCLUDED.notes, applications.notes),
                        oa_date = COALESCE(EXCLUDED.oa_date, applications.oa_date),
                        referral_status = COALESCE(EXCLUDED.referral_status, applications.referral_status),
                        resume_version = COALESCE(EXCLUDED.resume_version, applications.resume_version),
                        updated_at = NOW()
                    RETURNING id, posting_id, stage, notes, oa_date, referral_status, resume_version, updated_at;
                    """,
                    (posting_id, stage, notes, oa_date, referral_status, resume_version),
                )
                row = cur.fetchone()
                # Also synchronize posting status if applied
                if stage in ("applied", "oa", "phone_screen", "technical_interview", "onsite", "offer"):
                    cur.execute("UPDATE postings SET status = 'applied', updated_at = NOW() WHERE id = %s;", (posting_id,))
            conn.commit()
        return dict(row)

    def get_application_by_posting_id(self, posting_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves tracking information for an applied posting."""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM applications WHERE posting_id = %s;", (posting_id,))
                row = cur.fetchone()
                return dict(row) if row else None

    # =========================================================================
    # Experience Logs & Community Knowledge Sharing
    # =========================================================================

    def save_experience_log(
        self,
        company_id: int,
        stage: str,
        posting_id: Optional[int] = None,
        application_id: Optional[int] = None,
        author_user_id: Optional[int] = None,
        technical_questions: Optional[str] = None,
        takeaways: Optional[str] = None,
        offer_details: Optional[str] = None,
        oa_date: Optional[str] = None,
        interview_date: Optional[str] = None,
        interview_round: Optional[str] = None,
        visibility: str = "private",
        author_display_mode: str = "named",
        confidentiality_ack: bool = False,
        log_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Creates or updates an interview experience log with consent & privacy controls."""
        if visibility == "shared" and not confidentiality_ack:
            raise ValueError("Sharing with community requires confidentiality acknowledgment (NDA confirmation).")

        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Determine verified_applicant flag based on application existence
                verified_applicant = False
                app_id = application_id
                if not app_id and posting_id:
                    cur.execute("SELECT id FROM applications WHERE posting_id = %s;", (posting_id,))
                    app_row = cur.fetchone()
                    if app_row:
                        app_id = app_row["id"]
                        verified_applicant = True
                elif app_id:
                    verified_applicant = True

                if log_id:
                    cur.execute(
                        """
                        UPDATE experience_logs
                        SET company_id = %s,
                            posting_id = %s,
                            application_id = %s,
                            stage = %s,
                            technical_questions = %s,
                            takeaways = %s,
                            offer_details = %s,
                            oa_date = %s,
                            interview_date = %s,
                            interview_round = %s,
                            visibility = %s,
                            author_display_mode = %s,
                            verified_applicant = %s,
                            confidentiality_ack = %s,
                            updated_at = NOW()
                        WHERE id = %s
                        RETURNING *;
                        """,
                        (
                            company_id,
                            posting_id,
                            app_id,
                            stage,
                            technical_questions,
                            takeaways,
                            offer_details,
                            oa_date or None,
                            interview_date or None,
                            interview_round,
                            visibility,
                            author_display_mode,
                            verified_applicant,
                            confidentiality_ack,
                            log_id,
                        ),
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO experience_logs (
                            company_id, posting_id, application_id, author_user_id,
                            stage, technical_questions, takeaways, offer_details,
                            oa_date, interview_date, interview_round,
                            visibility, author_display_mode, verified_applicant,
                            confidentiality_ack, created_at, updated_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                        RETURNING *;
                        """,
                        (
                            company_id,
                            posting_id,
                            app_id,
                            author_user_id,
                            stage,
                            technical_questions,
                            takeaways,
                            offer_details,
                            oa_date or None,
                            interview_date or None,
                            interview_round,
                            visibility,
                            author_display_mode,
                            verified_applicant,
                            confidentiality_ack,
                        ),
                    )
                row = cur.fetchone()
            conn.commit()
        return dict(row)

    def get_experience_log_by_id(self, log_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves a single experience log by ID."""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM experience_logs WHERE id = %s;", (log_id,))
                row = cur.fetchone()
                return dict(row) if row else None

    def delete_experience_log(self, log_id: int, author_user_id: Optional[int] = None) -> bool:
        """Deletes an experience log owned by the author."""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                if author_user_id is not None:
                    cur.execute("DELETE FROM experience_logs WHERE id = %s AND author_user_id = %s;", (log_id, author_user_id))
                else:
                    cur.execute("DELETE FROM experience_logs WHERE id = %s;", (log_id,))
                deleted = cur.rowcount > 0
            conn.commit()
        return deleted

    # =========================================================================
    # External Prep Resources (Tavily-pulled from LeetCode, Blind, GfG)
    # =========================================================================

    def save_prep_resource(
        self,
        company_id: int,
        snippet: str,
        source: str,
        url: str,
        stage: Optional[str] = None,
        title: Optional[str] = None,
        posting_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Saves an externally-pulled interview prep resource."""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    INSERT INTO prep_resources (company_id, posting_id, stage, title, snippet, source, url, fetched_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                    RETURNING *;
                    """,
                    (company_id, posting_id, stage, title, snippet, source, url),
                )
                row = cur.fetchone()
            conn.commit()
        return dict(row)

    def clear_prep_resources_for_company(self, company_id: int) -> int:
        """Clears previously fetched external prep resources for a company."""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM prep_resources WHERE company_id = %s;", (company_id,))
                deleted = cur.rowcount
            conn.commit()
        return deleted

    # =========================================================================
    # Merged Experience & External Prep Query
    # =========================================================================

    def get_merged_experiences(
        self,
        company_id: int,
        stage_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieves merged community experience logs and external prep resources for a company.

        Community logs only include shared entries with author display masked ('Anonymous' or User name, never raw email).
        External entries carry direct links back to original source platforms.
        """
        query = """
            -- Community (internal, user-submitted)
            SELECT 
                el.id,
                'community' AS source_type,
                el.stage,
                el.technical_questions,
                el.takeaways,
                el.offer_details,
                CASE 
                    WHEN el.author_display_mode = 'anonymous' THEN 'Anonymous' 
                    ELSE COALESCE(u.name, 'Argus Member') 
                END AS author,
                el.verified_applicant,
                NULL AS url,
                el.created_at,
                el.author_user_id,
                el.visibility
            FROM experience_logs el 
            LEFT JOIN users u ON u.id = el.author_user_id
            WHERE el.company_id = %s AND el.visibility = 'shared'
              AND (%s IS NULL OR el.stage = %s)

            UNION ALL

            -- External (Tavily-pulled)
            SELECT 
                pr.id,
                'external' AS source_type,
                pr.stage,
                pr.snippet AS technical_questions,
                NULL AS takeaways,
                NULL AS offer_details,
                pr.source AS author,
                FALSE AS verified_applicant,
                pr.url,
                pr.fetched_at AS created_at,
                NULL AS author_user_id,
                'shared' AS visibility
            FROM prep_resources pr
            WHERE pr.company_id = %s
              AND (%s IS NULL OR pr.stage = %s)

            ORDER BY created_at DESC;
        """
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    query,
                    (company_id, stage_filter, stage_filter, company_id, stage_filter, stage_filter),
                )
                rows = cur.fetchall()
                results = []
                for r in rows:
                    item = dict(r)
                    if item.get("created_at"):
                        item["created_at"] = str(item["created_at"])
                    results.append(item)
                return results



if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Argus Database Management CLI")
    parser.add_argument("--init", action="store_true", help="Initialize database schema")
    parser.add_argument("--seed", action="store_true", help="Seed candidate project portfolio")
    parser.add_argument("--list-projects", action="store_true", help="List all candidate projects")
    parser.add_argument("--sync-companies", action="store_true", help="Sync target companies from config/companies.yaml")
    parser.add_argument("--list-companies", action="store_true", help="List all companies in database")
    args = parser.parse_args()

    db = DatabaseManager()

    try:
        if args.init:
            print("Initializing database schema...")
            db.init_schema()
            print("Schema initialized successfully.")

        if args.seed:
            print("Seeding projects portfolio...")
            count = db.seed_projects()
            print(f"Successfully seeded/updated {count} projects.")

        if args.sync_companies:
            print("Syncing target companies from config...")
            count = db.sync_companies_from_config()
            print(f"Successfully synced {count} companies into database.")

        if args.list_projects:
            projects = db.get_all_projects()
            print(f"\n--- Ground Truth Candidate Projects ({len(projects)}) ---")
            for p in projects:
                print(f"• [{p.id}] {p.name}: {p.summary[:80]}...")
                print(f"  Tags: {', '.join(p.tags)}")

        if args.list_companies:
            companies = db.get_all_companies()
            print(f"\n--- Monitored Companies ({len(companies)}) ---")
            for c in companies:
                print(f"• [{c.id}] {c.name} (ATS: {c.ats_type}) -> {c.careers_page_url}")

        if not (args.init or args.seed or args.sync_companies or args.list_projects or args.list_companies):
            parser.print_help()

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
