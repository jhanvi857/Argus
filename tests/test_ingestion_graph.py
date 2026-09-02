"""Unit and integration tests for Phase 5 Ingestion LangGraph.

Verifies:
1. extract_fields (Greenhouse, Lever, Generic formats, error handling)
2. classify_relevance (rule-based pre-filter fast path, Groq LLM invocation, fallback)
3. dedupe (fuzzy matching ratio >= 0.85, non-duplicate, DB exception handling)
4. conditional edge routing (relevant -> dedupe, irrelevant -> END, error -> END)
5. process_new_posting end-to-end execution
"""
import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime

from src.graphs.ingestion_state import IngestionState
from src.graphs.ingestion_graph import (
    extract_fields,
    classify_relevance,
    dedupe,
    route_after_classify,
    process_new_posting,
    TITLE_SIMILARITY_THRESHOLD,
    RULE_BASED_SKIP_LLM_CONFIDENCE,
)
from src.graphs.llm_classifier import LLMClassificationResult
from src.adapters.models import ExtractedPosting
from src.db.models import Company, Posting


class TestIngestionGraph(unittest.TestCase):
    """Test suite for Phase 5 Ingestion LangGraph nodes, routing, and pipeline."""

    # =========================================================================
    # 1. extract_fields
    # =========================================================================

    def test_extract_fields_greenhouse_payload(self):
        """Verify extract_fields correctly normalizes Greenhouse JSON shape."""
        raw = {
            "id": 12345,
            "title": "Software Engineering Intern - Infrastructure",
            "departments": [{"name": "Core Platform"}],
            "location": {"name": "Bengaluru, India"},
            "absolute_url": "https://boards.greenhouse.io/stripe/jobs/12345",
            "deadline": "2026-10-01",
        }
        state: IngestionState = {
            "company_id": 1,
            "company_name": "Stripe",
            "raw_posting": raw,
            "role_filter": [],
            "external_id": None,
            "title": None,
            "team": None,
            "location": None,
            "deadline": None,
            "url": None,
            "rule_based_result": None,
            "llm_classification": None,
            "is_relevant": None,
            "classification_rationale": None,
            "is_duplicate": False,
            "duplicate_of_posting_id": None,
            "error": None,
            "status": "pending",
            "db_manager": None,
        }

        output = extract_fields(state)
        self.assertEqual(output["external_id"], "12345")
        self.assertEqual(output["title"], "Software Engineering Intern - Infrastructure")
        self.assertEqual(output["team"], "Core Platform")
        self.assertEqual(output["location"], "Bengaluru, India")
        self.assertEqual(output["url"], "https://boards.greenhouse.io/stripe/jobs/12345")
        self.assertEqual(output["deadline"], "2026-10-01")
        self.assertEqual(output["status"], "pending")

    def test_extract_fields_lever_payload(self):
        """Verify extract_fields correctly normalizes Lever JSON shape."""
        raw = {
            "id": "lever-abc-1",
            "text": "Backend Engineering Intern",
            "categories": {
                "team": "Payments Engine",
                "location": "Singapore",
            },
            "hostedUrl": "https://jobs.lever.co/postman/lever-abc-1",
            "close_date": "2026-11-15",
        }
        state: IngestionState = {
            "company_id": 2,
            "company_name": "Postman",
            "raw_posting": raw,
            "role_filter": [],
            "external_id": None,
            "title": None,
            "team": None,
            "location": None,
            "deadline": None,
            "url": None,
            "rule_based_result": None,
            "llm_classification": None,
            "is_relevant": None,
            "classification_rationale": None,
            "is_duplicate": False,
            "duplicate_of_posting_id": None,
            "error": None,
            "status": "pending",
            "db_manager": None,
        }

        output = extract_fields(state)
        self.assertEqual(output["external_id"], "lever-abc-1")
        self.assertEqual(output["title"], "Backend Engineering Intern")
        self.assertEqual(output["team"], "Payments Engine")
        self.assertEqual(output["location"], "Singapore")
        self.assertEqual(output["url"], "https://jobs.lever.co/postman/lever-abc-1")
        self.assertEqual(output["deadline"], "2026-11-15")

    def test_extract_fields_generic_fallbacks(self):
        """Verify extract_fields handles generic field names."""
        raw = {
            "job_id": "gen-99",
            "job_title": "Distributed Systems Engineer",
            "department": "Storage Cloud",
            "office": "New York, NY",
            "job_url": "https://company.com/careers/99",
        }
        state = {"raw_posting": raw}
        output = extract_fields(state)
        self.assertEqual(output["external_id"], "gen-99")
        self.assertEqual(output["title"], "Distributed Systems Engineer")
        self.assertEqual(output["team"], "Storage Cloud")
        self.assertEqual(output["location"], "New York, NY")
        self.assertEqual(output["url"], "https://company.com/careers/99")

    def test_extract_fields_empty_payload(self):
        """Verify extract_fields safely fails on empty payload."""
        state = {"raw_posting": {}}
        output = extract_fields(state)
        self.assertEqual(output["status"], "error")
        self.assertIn("Empty raw_posting", output["error"])

    def test_extract_fields_missing_title(self):
        """Verify extract_fields returns error when title cannot be found."""
        state = {"raw_posting": {"id": 123, "description": "Some role without a title"}}
        output = extract_fields(state)
        self.assertEqual(output["status"], "error")
        self.assertIn("Could not extract title", output["error"])

    # =========================================================================
    # 2. classify_relevance
    # =========================================================================

    @patch("src.graphs.ingestion_graph.classify_with_llm")
    def test_classify_relevance_high_confidence_irrelevant_skips_llm(self, mock_llm):
        """Verify high-confidence irrelevant roles bypass the LLM entirely (free & fast)."""
        state = {
            "title": "Senior Director of Sales & Brand Marketing",
            "team": "Global Marketing",
            "location": "London",
            "role_filter": [],
            "company_name": "TestCo",
            "raw_posting": {},
        }
        output = classify_relevance(state)

        # Assert LLM was never called
        mock_llm.assert_not_called()
        self.assertFalse(output["is_relevant"])
        self.assertEqual(output["status"], "irrelevant")
        self.assertIn("Rule-based reject", output["classification_rationale"])
        self.assertIsNone(output["llm_classification"])

    @patch("src.graphs.ingestion_graph.classify_with_llm")
    def test_classify_relevance_calls_llm_for_swe_roles(self, mock_llm):
        """Verify potentially relevant SWE roles invoke LLM for judgment."""
        mock_llm.return_value = LLMClassificationResult(
            relevant=True,
            confidence=0.95,
            rationale="Matches target SWE intern profile with systems focus",
            detected_level="intern",
            detected_domain="systems",
        )

        state = {
            "title": "Software Engineering Intern - Systems & Infra",
            "team": "Core Platform",
            "location": "Bengaluru",
            "deadline": None,
            "role_filter": ["Software", "Intern"],
            "company_name": "Stripe",
            "raw_posting": {"id": 1},
        }

        output = classify_relevance(state)
        mock_llm.assert_called_once()
        self.assertTrue(output["is_relevant"])
        self.assertEqual(output["status"], "pending")
        self.assertIn("Matches target SWE intern profile", output["classification_rationale"])
        self.assertIsNotNone(output["llm_classification"])

    @patch("src.graphs.ingestion_graph.classify_with_llm")
    def test_classify_relevance_llm_fallback_when_unavailable(self, mock_llm):
        """Verify graceful fallback to rule-based result if LLM returns confidence 0 (e.g. no API key)."""
        mock_llm.return_value = LLMClassificationResult(
            relevant=False,
            confidence=0.0,
            rationale="GROQ_API_KEY not configured",
            detected_level=None,
            detected_domain=None,
        )

        state = {
            "title": "Software Engineer Intern",
            "team": "Backend",
            "location": "Bengaluru",
            "deadline": None,
            "role_filter": [],
            "company_name": "Citadel",
            "raw_posting": {},
        }

        output = classify_relevance(state)
        mock_llm.assert_called_once()
        # Rule-based for "Software Engineer Intern" says relevant=True
        self.assertTrue(output["is_relevant"])
        self.assertIn("Rule-based (LLM fallback)", output["classification_rationale"])

    def test_classify_relevance_no_title(self):
        """Verify empty title in state yields safe irrelevant result."""
        state = {"title": ""}
        output = classify_relevance(state)
        self.assertFalse(output["is_relevant"])
        self.assertEqual(output["status"], "irrelevant")

    # =========================================================================
    # 3. dedupe
    # =========================================================================

    def test_dedupe_identifies_reworded_duplicate(self):
        """Verify difflib SequenceMatcher catches reworded duplicate title (>= 0.85)."""
        mock_db = MagicMock()
        mock_db.find_similar_postings.return_value = [
            Posting(
                id=42,
                company_id=1,
                external_id="stripe-100",
                title="Software Engineering Intern - Infrastructure (Summer 2026)",
                url="https://stripe.com/jobs/100",
            )
        ]

        state = {
            "title": "Software Engineer Intern - Infrastructure (Summer 2026)",  # Slightly reworded
            "company_id": 1,
            "company_name": "Stripe",
            "db_manager": mock_db,
        }

        output = dedupe(state)
        self.assertTrue(output["is_duplicate"])
        self.assertEqual(output["duplicate_of_posting_id"], 42)
        self.assertEqual(output["status"], "duplicate")
        mock_db.find_similar_postings.assert_called_once_with(company_id=1, days=30)

    def test_dedupe_identifies_novel_posting(self):
        """Verify distinctly different posting is NOT marked as duplicate (< 0.85)."""
        mock_db = MagicMock()
        mock_db.find_similar_postings.return_value = [
            Posting(
                id=42,
                company_id=1,
                external_id="stripe-100",
                title="Frontend Engineer Intern - UI Platform",
                url="https://stripe.com/jobs/100",
            )
        ]

        state = {
            "title": "Backend Distributed Systems Engineer Intern",
            "company_id": 1,
            "company_name": "Stripe",
            "db_manager": mock_db,
        }

        output = dedupe(state)
        self.assertFalse(output["is_duplicate"])
        self.assertIsNone(output["duplicate_of_posting_id"])
        self.assertEqual(output["status"], "processed")

    def test_dedupe_handles_db_failure_gracefully(self):
        """Verify DB connection error during dedup fails open without crashing the graph."""
        mock_db = MagicMock()
        mock_db.find_similar_postings.side_effect = Exception("DB Connection Timeout")

        state = {
            "title": "Systems Engineer Intern",
            "company_id": 1,
            "company_name": "Stripe",
            "db_manager": mock_db,
        }

        output = dedupe(state)
        self.assertFalse(output["is_duplicate"])
        self.assertEqual(output["status"], "processed")

    def test_dedupe_missing_title_or_company_id(self):
        """Verify missing title or company_id safely returns non-duplicate."""
        self.assertFalse(dedupe({"title": "", "company_id": 1})["is_duplicate"])
        self.assertFalse(dedupe({"title": "SWE", "company_id": None})["is_duplicate"])

    # =========================================================================
    # 4. route_after_classify
    # =========================================================================

    def test_route_after_classify(self):
        """Verify conditional edge routes relevant -> dedupe, others -> END."""
        self.assertEqual(route_after_classify({"is_relevant": True, "status": "pending"}), "dedupe")
        self.assertEqual(route_after_classify({"is_relevant": False, "status": "irrelevant"}), "end")
        self.assertEqual(route_after_classify({"is_relevant": None, "status": "error"}), "end")

    # =========================================================================
    # 5. process_new_posting end-to-end
    # =========================================================================

    @patch("src.graphs.ingestion_graph.classify_with_llm")
    def test_process_new_posting_relevant_flow(self, mock_llm):
        """End-to-end test of process_new_posting for a relevant posting."""
        mock_llm.return_value = LLMClassificationResult(
            relevant=True,
            confidence=0.92,
            rationale="Matches SWE Intern requirements",
            detected_level="intern",
            detected_domain="swe",
        )

        mock_db = MagicMock()
        mock_db.find_similar_postings.return_value = []

        company = Company(
            id=5,
            name="Stripe",
            ats_type="greenhouse",
            careers_page_url="https://stripe.com/jobs",
        )
        extracted = ExtractedPosting(
            external_id="gh-77",
            title="Software Engineering Intern",
            url="https://boards.greenhouse.io/stripe/jobs/77",
            team="Infrastructure",
            raw_json={
                "id": 77,
                "title": "Software Engineering Intern",
                "departments": [{"name": "Infrastructure"}],
                "absolute_url": "https://boards.greenhouse.io/stripe/jobs/77",
            },
        )

        result = process_new_posting(extracted, company, role_filter=["Intern"], db_manager=mock_db)

        self.assertTrue(result["is_relevant"])
        self.assertFalse(result["is_duplicate"])
        self.assertEqual(result["status"], "processed")
        self.assertEqual(result["title"], "Software Engineering Intern")
        mock_db.find_similar_postings.assert_called_once()


if __name__ == "__main__":
    unittest.main()
