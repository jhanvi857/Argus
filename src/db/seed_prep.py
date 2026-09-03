"""Seed script to populate real, authentic 2022-2026 interview prep resources for all target companies."""
import os
import json
import logging
from pathlib import Path
from src.db.db_manager import DatabaseManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("argus.seed_prep")

SQL_FILE = Path(__file__).resolve().parent.parent.parent / "db" / "seed_prep_resources.sql"
FRONTEND_DATA_FILE = Path(__file__).resolve().parent.parent.parent / "frontend" / "src" / "data" / "default_prep_resources.json"


def seed_prep_resources():
    """Seeds real interview experiences into database and exports frontend offline cache."""
    db = DatabaseManager()
    
    # 1. Sync companies from companies.yaml first so all IDs exist
    synced_companies = db.sync_companies_from_config()
    logger.info(f"Synced {synced_companies} companies from configuration.")

    # 2. Execute seed SQL
    if SQL_FILE.exists():
        with open(SQL_FILE, "r", encoding="utf-8") as f:
            sql_content = f.read()

        with db.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql_content)
                cur.execute("SELECT COUNT(*) FROM prep_resources;")
                count = cur.fetchone()[0]
            conn.commit()
        logger.info(f"Successfully populated {count} authentic prep resources in database.")
    else:
        logger.warning(f"SQL seed file not found at {SQL_FILE}")

    # 3. Export all merged prep resources to JSON for frontend offline/caching support
    with db.get_connection() as conn:
        from psycopg2.extras import RealDictCursor
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT pr.id, pr.company_id, c.name as company_name, pr.stage, pr.title, pr.snippet, pr.source, pr.url, pr.fetched_at
                FROM prep_resources pr
                JOIN companies c ON c.id = pr.company_id
                ORDER BY pr.company_id, pr.id;
            """)
            rows = cur.fetchall()

    data = [dict(r) for r in rows]
    # Convert datetime to string
    for row in data:
        if row.get("fetched_at"):
            row["fetched_at"] = str(row["fetched_at"])

    FRONTEND_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(FRONTEND_DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    logger.info(f"Exported {len(data)} items to frontend cache at {FRONTEND_DATA_FILE}")


if __name__ == "__main__":
    seed_prep_resources()
