"""Argus Model Context Protocol (MCP) Server.

Exposes live ATS tracker, job postings, candidate applications, and LLM portfolio matcher
as callable MCP tools for Claude, Cursor, and AI coding assistants.

Tools specified in AGENTS.md:
- get_pending(company: Optional[str] = None): 'what is pending for Goldman' from DB
- get_recent_postings(days: int = 7, company: Optional[str] = None)
- get_match(posting_id: int)
- mark_interested(posting_id: int)
- update_application_status(posting_id: int, stage: str, ...)
"""
import sys
import json
import logging
from typing import Optional, List, Dict, Any

from mcp.server.mcpserver import MCPServer
from src.db.db_manager import DatabaseManager
from src.graphs.matcher_graph import process_match

logger = logging.getLogger(__name__)

mcp_server = MCPServer(
    name="argus",
    description="Argus Job Posting Monitor & Portfolio Matcher live tracker tools",
)


# =============================================================================
# Core Business Logic Implementations (Callable directly and via MCP)
# =============================================================================

def get_pending_impl(company: Optional[str] = None, db: Optional[DatabaseManager] = None) -> List[Dict[str, Any]]:
    """Answers 'what's pending for Goldman' (or all target companies) from the database."""
    try:
        database = db or DatabaseManager()
        results = database.get_pending_by_company(company=company)
        # Format datetimes to ISO strings for clean JSON serialization
        for r in results:
            for k in ("first_seen_at", "oa_date", "updated_at"):
                if r.get(k) is not None:
                    r[k] = str(r[k])
        return results
    except Exception as exc:
        logger.warning(f"Database query failed in get_pending: {exc}")
        return [{
            "error": f"Database query error: {exc}",
            "hint": "Check PostgreSQL connection or ensure db schema is initialized."
        }]


def get_recent_postings_impl(
    days: int = 7,
    company: Optional[str] = None,
    db: Optional[DatabaseManager] = None,
) -> List[Dict[str, Any]]:
    """Retrieves genuinely new relevant postings detected within the last N days."""
    try:
        database = db or DatabaseManager()
        results = database.get_recent_postings(days=days, company=company)
        for r in results:
            for k in ("first_seen_at", "last_seen_at"):
                if r.get(k) is not None:
                    r[k] = str(r[k])
        return results
    except Exception as exc:
        logger.warning(f"Database query failed in get_recent_postings: {exc}")
        return [{
            "error": f"Database query error: {exc}",
            "days": days,
            "company": company
        }]


def get_match_impl(posting_id: int, db: Optional[DatabaseManager] = None) -> Dict[str, Any]:
    """Retrieves portfolio project recommendations, rationale, and keywords for a posting."""
    try:
        database = db or DatabaseManager()
        match = database.get_match_by_posting_id(posting_id=posting_id)
        if not match:
            return {
                "status": "not_matched",
                "posting_id": posting_id,
                "message": "No match recommendation found for this posting. Use mark_interested to compute recommendations."
            }

        return {
            "status": "matched",
            "posting_id": match.posting_id,
            "recommended_project_ids": match.recommended_project_ids,
            "rationale": match.rationale,
            "suggested_keywords": match.suggested_keywords,
            "created_at": str(match.created_at) if match.created_at else None,
        }
    except Exception as exc:
        return {
            "status": "error",
            "posting_id": posting_id,
            "error": str(exc)
        }


def mark_interested_impl(posting_id: int, db: Optional[DatabaseManager] = None) -> Dict[str, Any]:
    """Marks posting as interested and triggers Phase 6 Matcher LangGraph."""
    try:
        database = db or DatabaseManager()
        result = process_match(posting_id=posting_id, db_manager=database)
        match_result = result.get("match_result") or {}
        return {
            "status": result.get("status", "matched"),
            "posting_id": posting_id,
            "recommended_project_ids": match_result.get("recommended_project_ids", []),
            "rationale": match_result.get("rationale", ""),
            "suggested_keywords": match_result.get("suggested_keywords", []),
            "validation_error": result.get("validation_error"),
            "retry_count": result.get("retry_count", 0),
        }
    except Exception as exc:
        logger.error(f"Failed to process match for posting #{posting_id}: {exc}")
        return {
            "status": "error",
            "posting_id": posting_id,
            "error": str(exc)
        }


def update_application_status_impl(
    posting_id: int,
    stage: str,
    notes: Optional[str] = None,
    oa_date: Optional[str] = None,
    referral_status: Optional[str] = None,
    resume_version: Optional[str] = None,
    db: Optional[DatabaseManager] = None,
) -> Dict[str, Any]:
    """Updates OA date, referral status, stage, and notes for an applied posting."""
    try:
        database = db or DatabaseManager()
        updated = database.update_application_status(
            posting_id=posting_id,
            stage=stage,
            notes=notes,
            oa_date=oa_date,
            referral_status=referral_status,
            resume_version=resume_version,
        )
        if updated.get("updated_at") is not None:
            updated["updated_at"] = str(updated["updated_at"])
        if updated.get("oa_date") is not None:
            updated["oa_date"] = str(updated["oa_date"])
        return {
            "status": "success",
            "application": updated,
        }
    except Exception as exc:
        logger.error(f"Failed to update application status for posting #{posting_id}: {exc}")
        return {
            "status": "error",
            "posting_id": posting_id,
            "error": str(exc)
        }


# =============================================================================
# MCP Server Tool Registrations
# =============================================================================

@mcp_server.tool(
    name="get_pending",
    description="Retrieve pending software engineering roles and in-flight application stages for a company (e.g. 'Goldman Sachs') or all companies."
)
def get_pending(company: Optional[str] = None) -> str:
    """Tool function returning serialized JSON of pending roles/applications."""
    results = get_pending_impl(company=company)
    return json.dumps(results, indent=2)


@mcp_server.tool(
    name="get_recent_postings",
    description="Fetch genuinely new relevant postings detected from official ATS portals in the last N days."
)
def get_recent_postings(days: int = 7, company: Optional[str] = None) -> str:
    """Tool function returning serialized JSON of recent postings."""
    results = get_recent_postings_impl(days=days, company=company)
    return json.dumps(results, indent=2)


@mcp_server.tool(
    name="get_match",
    description="Retrieve portfolio match recommendations, grounded project IDs, rationale, and keywords for a job posting."
)
def get_match(posting_id: int) -> str:
    """Tool function returning serialized JSON of match recommendation."""
    result = get_match_impl(posting_id=posting_id)
    return json.dumps(result, indent=2)


@mcp_server.tool(
    name="mark_interested",
    description="Mark a posting as 'Interested' and execute Phase 6 Matcher LangGraph to compute portfolio project recommendations."
)
def mark_interested(posting_id: int) -> str:
    """Tool function triggering matcher graph and returning recommendation result."""
    result = mark_interested_impl(posting_id=posting_id)
    return json.dumps(result, indent=2)


@mcp_server.tool(
    name="update_application_status",
    description="Update or insert an application tracking stage (applied, oa, phone_screen, technical_interview, onsite, offer, rejected), OA date, referral status, and resume version."
)
def update_application_status(
    posting_id: int,
    stage: str,
    notes: Optional[str] = None,
    oa_date: Optional[str] = None,
    referral_status: Optional[str] = None,
    resume_version: Optional[str] = None,
) -> str:
    """Tool function updating application record in Postgres."""
    result = update_application_status_impl(
        posting_id=posting_id,
        stage=stage,
        notes=notes,
        oa_date=oa_date,
        referral_status=referral_status,
        resume_version=resume_version,
    )
    return json.dumps(result, indent=2)


def main():
    """Run the MCP server over standard I/O (stdio transport)."""
    logging.basicConfig(level=logging.INFO, stream=sys.stderr)
    logger.info("Starting Argus MCP server on stdio transport...")
    mcp_server.run()


if __name__ == "__main__":
    main()
