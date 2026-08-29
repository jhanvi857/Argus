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


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Argus Database Management CLI")
    parser.add_argument("--init", action="store_true", help="Initialize database schema")
    parser.add_argument("--seed", action="store_true", help="Seed candidate project portfolio")
    parser.add_argument("--list-projects", action="store_true", help="List all candidate projects")
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

        if args.list_projects:
            projects = db.get_all_projects()
            print(f"\n--- Ground Truth Candidate Projects ({len(projects)}) ---")
            for p in projects:
                print(f"• [{p.id}] {p.name}: {p.summary[:80]}...")
                print(f"  Tags: {', '.join(p.tags)}")

        if not (args.init or args.seed or args.list_projects):
            parser.print_help()

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
