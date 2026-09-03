"""Curated external interview preparation and questions service.

Serves authentic, high-signal interview debriefs, OA questions, and round breakdowns
from LeetCode Discuss, TeamBlind, and GeeksforGeeks directly from Argus's knowledge base.
"""
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("argus.prep_service")


def get_curated_company_prep(
    company_id: int,
    stage_filter: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieves curated interview prep resources for a given company from the database."""
    from src.db.db_manager import DatabaseManager
    db = DatabaseManager()

    comp = db.get_company_by_id(company_id)
    if not comp:
        return {"status": "not_found", "message": f"Company #{company_id} not found", "items": []}

    with db.get_connection() as conn:
        from psycopg2.extras import RealDictCursor
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT id, company_id, stage, title, snippet, source, url, fetched_at
                FROM prep_resources
                WHERE company_id = %s
                  AND (%s IS NULL OR stage = %s)
                ORDER BY id ASC;
            """
            cur.execute(query, (company_id, stage_filter, stage_filter))
            rows = cur.fetchall()

    items = [dict(r) for r in rows]
    return {
        "status": "ok",
        "company_name": comp.name,
        "count": len(items),
        "items": items,
    }
