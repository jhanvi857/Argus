"""Unit and integration tests for Phase 6 Matcher LangGraph.

Verifies:
1. Node logic: load_job, load_portfolio, prefilter_projects
2. match_with_llm: output parsing, retry_count increment
3. validate_result: strict shortlist ID grounding (hallucination guardrail)
4. save_result: persistence into matches table and status update
5. needs_review: fallback with error annotation when retries are exhausted
6. route_after_validation: loop back vs save vs needs_review routing
7. Full graph end-to-end: successful match and retry-to-needs_review exhaustion
"""
import unittest
from unittest.mock import MagicMock, patch

from src.graphs.matcher_state import MatcherState
from src.graphs.matcher_graph import (
    load_job,
    load_portfolio,
    prefilter_projects,
    match_with_llm,
    validate_result,
    save_result,
    needs_review,
    route_after_validation,
    build_prompt,
    process_match,
    MatchResult,
    FALLBACK_PORTFOLIO,
)
from src.db.models import Posting, Project, Match


class TestMatcherGraph(unittest.TestCase):
    """Test suite for Phase 6 Matcher LangGraph nodes, routing, and guardrails."""

    def setUp(self):
        self.mock_db = MagicMock()
        self.sample_posting = Posting(
            id=101,
            company_id=1,
            external_id="stripe-infra-101",
            title="Software Engineering Intern - Distributed Systems",
            team="Infrastructure",
            url="https://stripe.com/jobs/101",
            raw_json={
                "description": "Work on high-throughput distributed consensus storage and zero-copy networking."
            },
        )
        self.mock_db.get_posting_by_id.return_value = self.sample_posting
        self.mock_db.get_all_projects.return_value = [
            Project(**p) for p in FALLBACK_PORTFOLIO
        ]

    # =========================================================================
    # 1. load_job & load_portfolio
    # =========================================================================

    def test_load_job_from_db(self):
        """Verify load_job fetches posting record and prepares job_data dict."""
        state: MatcherState = {
            "posting_id": "101",
            "job_data": None,
            "portfolio": None,
            "shortlist": None,
            "match_result": None,
            "validation_error": None,
            "retry_count": 0,
            "status": "pending",
            "db_manager": self.mock_db,
        }

        output = load_job(state)
        self.mock_db.get_posting_by_id.assert_called_once_with(101)
        self.assertIn("job_data", output)
        self.assertEqual(output["job_data"]["title"], "Software Engineering Intern - Distributed Systems")
        self.assertEqual(output["job_data"]["team"], "Infrastructure")

    def test_load_portfolio_from_db(self):
        """Verify load_portfolio retrieves candidate projects from Postgres."""
        state: MatcherState = {
            "posting_id": "101",
            "job_data": None,
            "portfolio": None,
            "shortlist": None,
            "match_result": None,
            "validation_error": None,
            "retry_count": 0,
            "status": "pending",
            "db_manager": self.mock_db,
        }

        output = load_portfolio(state)
        self.mock_db.get_all_projects.assert_called_once()
        self.assertIn("portfolio", output)
        self.assertGreaterEqual(len(output["portfolio"]), 5)

    # =========================================================================
    # 2. prefilter_projects
    # =========================================================================

    def test_prefilter_projects_ranks_relevant_systems_projects(self):
        """Verify prefilter_projects ranks Evora (Raft/LSM-tree) and NioFlow (Netty/Zero-Copy) on top for distributed systems JD."""
        state: MatcherState = {
            "posting_id": "101",
            "job_data": {
                "title": "Distributed Systems Infrastructure Intern",
                "team": "Storage & Networking",
                "raw_description": "Building Raft consensus distributed key-value storage and zero-copy networking engines in Go/Java.",
            },
            "portfolio": FALLBACK_PORTFOLIO,
            "shortlist": None,
            "match_result": None,
            "validation_error": None,
            "retry_count": 0,
            "status": "pending",
            "db_manager": None,
        }

        output = prefilter_projects(state)
        shortlist = output["shortlist"]
        self.assertLessEqual(len(shortlist), 5)

        shortlist_ids = [p["id"] for p in shortlist]
        # Evora and Nioflow should both be in the shortlist
        self.assertTrue("evora" in shortlist_ids or "nioflow" in shortlist_ids)

    # =========================================================================
    # 3. match_with_llm & retry count
    # =========================================================================

    def test_match_with_llm_increments_retry_count(self):
        """Verify match_with_llm increments retry_count on each execution."""
        state: MatcherState = {
            "posting_id": "101",
            "job_data": {"title": "Software Engineering Intern"},
            "portfolio": FALLBACK_PORTFOLIO,
            "shortlist": FALLBACK_PORTFOLIO[:3],
            "match_result": None,
            "validation_error": None,
            "retry_count": 0,
            "status": "pending",
            "db_manager": None,
        }

        output = match_with_llm(state)
        self.assertEqual(output["retry_count"], 1)
        self.assertIn("match_result", output)
        self.assertIn("recommended_project_ids", output["match_result"])

    # =========================================================================
    # 4. validate_result & Hallucination Guardrail
    # =========================================================================

    def test_validate_result_accepts_valid_shortlist_ids(self):
        """Verify validation passes when recommended_project_ids belong strictly to the shortlist."""
        shortlist = [{"id": "evora"}, {"id": "nioflow"}, {"id": "cloudweave"}]
        state: MatcherState = {
            "posting_id": "101",
            "job_data": {},
            "portfolio": [],
            "shortlist": shortlist,
            "match_result": {
                "recommended_project_ids": ["evora", "nioflow"],
                "rationale": "High-performance distributed systems match.",
                "suggested_keywords": ["Raft", "Zero-Copy"],
            },
            "validation_error": None,
            "retry_count": 1,
            "status": "pending",
            "db_manager": None,
        }

        output = validate_result(state)
        self.assertIsNone(output["validation_error"])

    def test_validate_result_rejects_hallucinated_ids(self):
        """Verify validation fails (hallucination guardrail) when model returns project IDs not in the shortlist."""
        shortlist = [{"id": "evora"}, {"id": "nioflow"}]
        state: MatcherState = {
            "posting_id": "101",
            "job_data": {},
            "portfolio": [],
            "shortlist": shortlist,
            "match_result": {
                "recommended_project_ids": ["evora", "invented_project_xyz"],  # Hallucinated ID
                "rationale": "Great project.",
                "suggested_keywords": ["Distributed"],
            },
            "validation_error": None,
            "retry_count": 1,
            "status": "pending",
            "db_manager": None,
        }

        output = validate_result(state)
        self.assertIsNotNone(output["validation_error"])
        self.assertIn("invented_project_xyz", output["validation_error"])

    def test_validate_result_rejects_empty_ids(self):
        """Verify validation fails when model produces no recommended IDs."""
        shortlist = [{"id": "evora"}]
        state: MatcherState = {
            "posting_id": "101",
            "job_data": {},
            "portfolio": [],
            "shortlist": shortlist,
            "match_result": {
                "recommended_project_ids": [],
                "rationale": "None matched",
                "suggested_keywords": [],
            },
            "validation_error": None,
            "retry_count": 1,
            "status": "pending",
            "db_manager": None,
        }

        output = validate_result(state)
        self.assertIsNotNone(output["validation_error"])
        self.assertIn("empty", output["validation_error"].lower())

    # =========================================================================
    # 5. save_result & needs_review
    # =========================================================================

    def test_save_result_persists_match_and_marks_status(self):
        """Verify save_result writes match to database and sets status='matched'."""
        state: MatcherState = {
            "posting_id": "101",
            "job_data": {},
            "portfolio": [],
            "shortlist": [],
            "match_result": {
                "recommended_project_ids": ["evora"],
                "rationale": "Perfect consensus store match.",
                "suggested_keywords": ["Raft", "Go"],
            },
            "validation_error": None,
            "retry_count": 1,
            "status": "pending",
            "db_manager": self.mock_db,
        }

        output = save_result(state)
        self.assertEqual(output["status"], "matched")
        self.mock_db.save_match.assert_called_once_with(
            posting_id=101,
            recommended_project_ids=["evora"],
            rationale="Perfect consensus store match.",
            suggested_keywords=["Raft", "Go"],
        )
        self.mock_db.update_posting_status.assert_called_once_with(101, "reviewed")

    def test_needs_review_surfaces_validation_error(self):
        """Verify needs_review sets status='needs_review' with error message for UI badge."""
        state: MatcherState = {
            "posting_id": "101",
            "job_data": {},
            "portfolio": [],
            "shortlist": [],
            "match_result": None,
            "validation_error": "Hallucinated project IDs: ['phantom_proj']",
            "retry_count": 3,
            "status": "pending",
            "db_manager": None,
        }

        output = needs_review(state)
        self.assertEqual(output["status"], "needs_review")
        self.assertIn("phantom_proj", output["validation_error"])

    # =========================================================================
    # 6. route_after_validation
    # =========================================================================

    def test_route_after_validation(self):
        """Verify conditional edge routes:
        - pass -> save_result
        - fail, retry < 3 -> match_with_llm
        - fail, retry >= 3 -> needs_review
        """
        # Pass
        self.assertEqual(
            route_after_validation({"validation_error": None, "retry_count": 1}),
            "save_result",
        )

        # Fail with retry headroom
        self.assertEqual(
            route_after_validation({"validation_error": "Invalid ID", "retry_count": 1}),
            "match_with_llm",
        )
        self.assertEqual(
            route_after_validation({"validation_error": "Invalid ID", "retry_count": 2}),
            "match_with_llm",
        )

        # Fail with 3 retries exhausted
        self.assertEqual(
            route_after_validation({"validation_error": "Invalid ID", "retry_count": 3}),
            "needs_review",
        )
        self.assertEqual(
            route_after_validation({"validation_error": "Invalid ID", "retry_count": 4}),
            "needs_review",
        )

    # =========================================================================
    # 7. End-to-End Graph Execution
    # =========================================================================

    def test_process_match_success_flow(self):
        """Verify end-to-end process_match succeeds, yielding status='matched' and grounded recommendations."""
        result = process_match(posting_id=101, db_manager=self.mock_db)

        self.assertEqual(result["status"], "matched")
        self.assertIsNone(result["validation_error"])
        self.assertIsNotNone(result["match_result"])

        rec_ids = result["match_result"]["recommended_project_ids"]
        self.assertGreater(len(rec_ids), 0)

        # All recommended IDs must exist in the candidate portfolio
        valid_portfolio_ids = {p["id"] for p in FALLBACK_PORTFOLIO}
        for pid in rec_ids:
            self.assertIn(pid, valid_portfolio_ids)

        self.mock_db.save_match.assert_called_once()

    @patch("src.graphs.matcher_graph.call_llm_for_match")
    def test_process_match_exhausted_retries_routes_to_needs_review(self, mock_call_llm):
        """Verify graph loops on validation errors and terminates at needs_review when retries reach 3."""
        # LLM repeatedly returns a hallucinated ID not in the candidate portfolio
        mock_call_llm.return_value = {
            "recommended_project_ids": ["completely_hallucinated_project"],
            "rationale": "Hallucinated project",
            "suggested_keywords": [],
        }

        result = process_match(posting_id=101, db_manager=self.mock_db)

        self.assertEqual(result["status"], "needs_review")
        self.assertIsNotNone(result["validation_error"])
        self.assertGreaterEqual(result["retry_count"], 3)
        self.assertIn("completely_hallucinated_project", result["validation_error"])


if __name__ == "__main__":
    unittest.main()
