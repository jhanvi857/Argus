"""Comprehensive integration test suite for Frontend, Backend, Database, and n8n."""
import json
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from src.pipeline.api import app
from src.db.db_manager import DatabaseManager
from src.db.models import Match


class TestSystemIntegration(unittest.TestCase):
    """End-to-end integration test validating the 4 core pillars: Frontend, Backend, DB, and n8n."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.project_root = Path(__file__).resolve().parent.parent

    def test_backend_health_check(self):
        """Verify FastAPI backend is healthy."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")

    def test_companies_endpoint_and_catalog(self):
        """Verify /companies returns all monitored companies across all tiers."""
        response = self.client.get("/companies")
        self.assertEqual(response.status_code, 200)
        companies = response.json()
        self.assertGreaterEqual(len(companies), 90)

        company_names = [c["name"] for c in companies]
        self.assertIn("Google", company_names)
        self.assertIn("Amazon", company_names)
        self.assertIn("Meta", company_names)
        self.assertIn("Goldman Sachs", company_names)
        self.assertIn("Stripe", company_names)
        self.assertIn("Nvidia", company_names)

    def test_telemetry_endpoint(self):
        """Verify telemetry endpoint returns live ingestion status."""
        response = self.client.get("/telemetry")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("companies_checked", data)
        self.assertIn("is_running", data)
        self.assertIn("logs", data)

    @patch("src.graphs.matcher_graph.process_match")
    def test_postings_interested_triggers_matcher(self, mock_process_match):
        """Verify POST /postings/{id}/interested triggers LangGraph matcher and returns recommendations."""
        mock_process_match.return_value = {
            "posting_id": "101",
            "status": "matched",
            "match_result": {
                "recommended_project_ids": ["nioflow", "evora"],
                "rationale": "Strong high-throughput systems alignment.",
                "suggested_keywords": ["Raft", "Distributed Systems"],
            },
            "validation_error": None,
            "retry_count": 1,
        }

        response = self.client.post("/postings/101/interested")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "matched")
        self.assertEqual(data["match_result"]["recommended_project_ids"], ["nioflow", "evora"])

    @patch.object(DatabaseManager, "update_application_status")
    def test_application_tracking_persistence(self, mock_update_status):
        """Verify application update endpoint connects to DB."""
        mock_update_status.return_value = {
            "id": 1,
            "posting_id": 101,
            "stage": "oa",
            "oa_date": "2026-09-15",
            "notes": "HackerRank round",
            "referral_status": "referred",
        }

        payload = {
            "stage": "oa",
            "oa_date": "2026-09-15",
            "notes": "HackerRank round",
            "referral_status": "referred",
        }
        response = self.client.post("/postings/101/application", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["application"]["stage"], "oa")

    def test_n8n_workflow_validity_and_nodes(self):
        """Verify n8n/argus_workflow.json has all required nodes for cron, HTTP request, DB query, SMTP and dedup."""
        workflow_file = self.project_root / "n8n" / "argus_workflow.json"
        self.assertTrue(workflow_file.exists(), "n8n/argus_workflow.json must exist")

        with open(workflow_file, "r", encoding="utf-8") as f:
            workflow = json.load(f)

        self.assertIn("nodes", workflow)
        self.assertIn("connections", workflow)

        node_names = [n["name"] for n in workflow["nodes"]]
        self.assertIn("Schedule Trigger", node_names)
        self.assertIn("Webhook Trigger", node_names)
        self.assertIn("HTTP Request", node_names)
        self.assertIn("PostgreSQL", node_names)
        self.assertIn("IF", node_names)
        self.assertIn("Code", node_names)
        self.assertIn("Send Email", node_names)
        self.assertIn("Postgres — Mark Notified", node_names)

        # Check HTTP Request targets backend ingestion API
        http_node = next(n for n in workflow["nodes"] if n["name"] == "HTTP Request")
        self.assertEqual(http_node["parameters"]["url"], "http://app:8000/run-ingestion")
        self.assertEqual(http_node["parameters"]["method"], "POST")

        # Check PostgreSQL node checks unnotified relevant postings
        db_query_node = next(n for n in workflow["nodes"] if n["name"] == "PostgreSQL")
        query_text = db_query_node["parameters"]["query"]
        self.assertIn("p.relevant = true", query_text)
        self.assertIn("p.notified_at IS NULL", query_text)

        # Check Mark Notified node updates notified_at
        mark_node = next(n for n in workflow["nodes"] if n["name"] == "Postgres — Mark Notified")
        update_query = mark_node["parameters"]["query"]
        self.assertIn("UPDATE postings", update_query)
        self.assertIn("SET notified_at = NOW()", update_query)

    def test_docker_compose_configuration(self):
        """Verify docker-compose.yml defines postgres, app, n8n, and frontend services with network linking."""
        compose_file = self.project_root / "docker-compose.yml"
        self.assertTrue(compose_file.exists(), "docker-compose.yml must exist")
        content = compose_file.read_text(encoding="utf-8")

        self.assertIn("argus-postgres", content)
        self.assertIn("argus-app", content)
        self.assertIn("argus-n8n", content)
        self.assertIn("argus-frontend", content)
        self.assertIn("argus-network", content)


if __name__ == "__main__":
    unittest.main()
