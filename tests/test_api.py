"""Unit tests for the Argus FastAPI ingestion endpoint."""
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from src.pipeline.api import app


class TestIngestionAPI(unittest.TestCase):
    """Test suite for FastAPI ingestion routes."""

    def setUp(self):
        self.client = TestClient(app)

    def test_healthcheck(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "healthy"})

    @patch("src.pipeline.api.run_all")
    def test_run_ingestion_endpoint(self, mock_run_all):
        mock_run_all.return_value = [
            {
                "company": "Citadel",
                "status": "success",
                "new_postings": 2,
                "relevant_postings": 1,
                "updated_postings": 0,
                "active_postings": 5,
                "closed_postings": 0,
                "snapshot_id": 100,
            },
            {
                "company": "Stripe",
                "status": "success",
                "new_postings": 1,
                "relevant_postings": 1,
                "updated_postings": 0,
                "active_postings": 3,
                "closed_postings": 0,
                "snapshot_id": 101,
            },
        ]

        response = self.client.post("/run-ingestion")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["companies_checked"], 2)
        self.assertEqual(data["successful_count"], 2)
        self.assertEqual(data["new_relevant_count"], 2)
        self.assertEqual(len(data["results"]), 2)
        mock_run_all.assert_called_once()

    @patch("src.graphs.matcher_graph.process_match")
    def test_mark_interested_endpoint(self, mock_process_match):
        """Verify POST /postings/{id}/interested triggers Matcher LangGraph."""
        mock_process_match.return_value = {
            "posting_id": "42",
            "status": "matched",
            "match_result": {
                "recommended_project_ids": ["evora", "nioflow"],
                "rationale": "High fit.",
                "suggested_keywords": ["Raft"],
            },
            "validation_error": None,
            "retry_count": 1,
        }
        response = self.client.post("/postings/42/interested")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "matched")
        self.assertEqual(data["posting_id"], 42)
        self.assertIn("evora", data["match_result"]["recommended_project_ids"])

    @patch("src.db.db_manager.DatabaseManager.get_match_by_posting_id")
    def test_get_match_endpoint(self, mock_get_match):
        """Verify GET /postings/{id}/match returns stored match recommendations."""
        from src.db.models import Match
        mock_get_match.return_value = Match(
            id=1,
            posting_id=42,
            recommended_project_ids=["nioflow"],
            rationale="Great systems project.",
            suggested_keywords=["Netty"],
        )
        response = self.client.get("/postings/42/match")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["posting_id"], 42)
        self.assertEqual(data["recommended_project_ids"], ["nioflow"])


if __name__ == "__main__":
    unittest.main()
