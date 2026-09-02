"""Unit tests for Phase 7 MCP server and tools."""
import unittest
from unittest.mock import patch, MagicMock
import json

from src.mcp.server import (
    get_pending_impl,
    get_recent_postings_impl,
    get_match_impl,
    mark_interested_impl,
    update_application_status_impl,
    mcp_server,
)
from src.db.models import Match


class TestMCPServer(unittest.TestCase):
    """Test suite for Argus MCP tools."""

    def setUp(self):
        self.mock_db = MagicMock()

    def test_mcp_server_registers_all_five_tools(self):
        """Verifies that all 5 tools defined in AGENTS.md are registered with the MCP server."""
        import asyncio
        tools = asyncio.run(mcp_server.list_tools())
        tool_names = [t.name for t in tools]
        expected_tools = [
            "get_pending",
            "get_recent_postings",
            "get_match",
            "mark_interested",
            "update_application_status",
        ]
        for t in expected_tools:
            self.assertIn(t, tool_names, f"Expected tool '{t}' to be registered in MCP server")

    def test_get_pending_by_company(self):
        """Verify get_pending filters by company and returns in-flight applications."""
        self.mock_db.get_pending_by_company.return_value = [
            {
                "posting_id": 101,
                "company_name": "Goldman Sachs",
                "title": "Summer Analyst - Technology",
                "team": "Engineering",
                "url": "https://goldmansachs.tal.net/vx/job/101",
                "posting_status": "reviewed",
                "relevant": True,
                "application_stage": "oa",
                "oa_date": "2026-09-15",
                "referral_status": "referred",
                "resume_version": "v3_distributed_systems",
                "notes": "HackerRank OA scheduled",
            }
        ]

        result = get_pending_impl(company="Goldman Sachs", db=self.mock_db)
        self.mock_db.get_pending_by_company.assert_called_once_with(company="Goldman Sachs")
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["company_name"], "Goldman Sachs")
        self.assertEqual(result[0]["application_stage"], "oa")

    def test_get_recent_postings(self):
        """Verify get_recent_postings returns postings detected in past N days."""
        self.mock_db.get_recent_postings.return_value = [
            {
                "posting_id": 202,
                "company_name": "Stripe",
                "title": "Software Engineer Intern",
                "team": "Payments",
                "url": "https://stripe.com/jobs/202",
                "status": "new",
                "relevant": True,
                "first_seen_at": "2026-09-01T10:00:00Z",
            }
        ]

        result = get_recent_postings_impl(days=3, company="Stripe", db=self.mock_db)
        self.mock_db.get_recent_postings.assert_called_once_with(days=3, company="Stripe")
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["title"], "Software Engineer Intern")

    def test_get_match_found(self):
        """Verify get_match returns recommendation and rationale for matched posting."""
        self.mock_db.get_match_by_posting_id.return_value = Match(
            id=1,
            posting_id=101,
            recommended_project_ids=["nioflow", "evora"],
            rationale="Excellent high-throughput systems alignment.",
            suggested_keywords=["Raft", "Netty", "gRPC"],
        )

        result = get_match_impl(posting_id=101, db=self.mock_db)
        self.assertEqual(result["status"], "matched")
        self.assertEqual(result["posting_id"], 101)
        self.assertIn("nioflow", result["recommended_project_ids"])

    def test_get_match_not_found(self):
        """Verify get_match handles unmatched posting gracefully."""
        self.mock_db.get_match_by_posting_id.return_value = None

        result = get_match_impl(posting_id=999, db=self.mock_db)
        self.assertEqual(result["status"], "not_matched")
        self.assertIn("No match recommendation", result["message"])

    @patch("src.mcp.server.process_match")
    def test_mark_interested_triggers_matcher_graph(self, mock_process_match):
        """Verify mark_interested triggers Phase 6 Matcher LangGraph."""
        mock_process_match.return_value = {
            "posting_id": "101",
            "status": "matched",
            "match_result": {
                "recommended_project_ids": ["cloudweave", "gitresolve"],
                "rationale": "Strong fit for infrastructure role.",
                "suggested_keywords": ["Kubernetes", "CRDT"],
            },
            "validation_error": None,
            "retry_count": 1,
        }

        result = mark_interested_impl(posting_id=101, db=self.mock_db)
        self.assertEqual(result["status"], "matched")
        self.assertEqual(result["recommended_project_ids"], ["cloudweave", "gitresolve"])
        mock_process_match.assert_called_once_with(posting_id=101, db_manager=self.mock_db)

    def test_update_application_status(self):
        """Verify update_application_status persists stage, notes, and dates."""
        self.mock_db.update_application_status.return_value = {
            "id": 1,
            "posting_id": 101,
            "stage": "interviewing",
            "notes": "Round 1 DSA completed",
            "oa_date": "2026-09-02",
            "referral_status": "referred",
            "resume_version": "v2",
            "updated_at": "2026-09-02T12:00:00Z",
        }

        result = update_application_status_impl(
            posting_id=101,
            stage="interviewing",
            notes="Round 1 DSA completed",
            oa_date="2026-09-02",
            referral_status="referred",
            resume_version="v2",
            db=self.mock_db,
        )

        self.assertEqual(result["status"], "success")
        self.assertEqual(result["application"]["stage"], "interviewing")
        self.mock_db.update_application_status.assert_called_once_with(
            posting_id=101,
            stage="interviewing",
            notes="Round 1 DSA completed",
            oa_date="2026-09-02",
            referral_status="referred",
            resume_version="v2",
        )


if __name__ == "__main__":
    unittest.main()
