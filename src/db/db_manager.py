"""Database connection and lifecycle manager for Argus."""
import os
import sys
from pathlib import Path
from typing import List, Optional, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor, Json
from dotenv import load_dotenv

from .models import Project, Company, Posting, Match, Application, Snapshot

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
        return psycopg2.connect(self.database_url)

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

    def insert_new_postings(self, company_id: int, postings: List[Any]) -> List[int]:
        """Inserts genuinely new postings into the postings table."""
        if not postings:
            return []

        inserted_ids: List[int] = []
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                for p in postings:
                    raw_json = getattr(p, "raw_json", None) or {}
                    cur.execute(
                        """
                        INSERT INTO postings (
                            company_id, external_id, title, team, deadline, url,
                            raw_json, status, relevant, notified_at, first_seen_at, last_seen_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, 'new', NULL, NULL, NOW(), NOW())
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

    def update_company_last_checked(self, company_id: int) -> None:
        """Updates last_checked_at timestamp for a company."""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE companies SET last_checked_at = NOW(), updated_at = NOW() WHERE id = %s;",
                    (company_id,),
                )
            conn.commit()



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
