"""Unit and integration tests for Argus Community + External Experience Sharing."""
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from src.pipeline.api import app
from src.db.db_manager import DatabaseManager


class TestExperienceLogs(unittest.TestCase):
    """Test suite for Experience Sharing & Prep Resources."""

    def setUp(self):
        self.client = TestClient(app)

    @patch("src.db.db_manager.DatabaseManager.get_connection")
    def test_save_experience_log_confidentiality_enforcement(self, mock_get_conn):
        """Verify that sharing with community without confidentiality_ack raises error."""
        db = DatabaseManager()
        with self.assertRaises(ValueError) as ctx:
            db.save_experience_log(
                company_id=1,
                stage="oa",
                visibility="shared",
                confidentiality_ack=False,
            )
        self.assertIn("confidentiality acknowledgment", str(ctx.exception))

    @patch("src.db.db_manager.DatabaseManager.get_connection")
    def test_save_experience_log_success(self, mock_get_conn):
        """Verify successful experience log creation with consent and verification."""
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_get_conn.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur

        mock_cur.fetchone.return_value = {
            "id": 1,
            "company_id": 1,
            "posting_id": 10,
            "application_id": 5,
            "author_user_id": 2,
            "stage": "technical_interview",
            "technical_questions": "Implement a concurrent ring buffer.",
            "takeaways": "Interviewer focused on lock-free synchronization.",
            "visibility": "shared",
            "author_display_mode": "named",
            "verified_applicant": True,
            "confidentiality_ack": True,
        }

        db = DatabaseManager()
        result = db.save_experience_log(
            company_id=1,
            stage="technical_interview",
            posting_id=10,
            application_id=5,
            author_user_id=2,
            technical_questions="Implement a concurrent ring buffer.",
            takeaways="Interviewer focused on lock-free synchronization.",
            visibility="shared",
            author_display_mode="named",
            confidentiality_ack=True,
        )

        self.assertEqual(result["id"], 1)
        self.assertEqual(result["visibility"], "shared")
        self.assertTrue(result["verified_applicant"])
        self.assertTrue(result["confidentiality_ack"])

    @patch("src.db.db_manager.DatabaseManager.get_connection")
    def test_get_merged_experiences_author_masking(self, mock_get_conn):
        """Verify merged experiences query masks author and labels sources correctly."""
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_get_conn.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur

        mock_cur.fetchall.return_value = [
            {
                "id": 1,
                "source_type": "community",
                "stage": "oa",
                "technical_questions": "LeetCode 42 Trapping Rain Water",
                "takeaways": "Felt confident.",
                "offer_details": None,
                "author": "Anonymous",
                "verified_applicant": True,
                "url": None,
                "created_at": "2026-09-02 12:00:00",
                "author_user_id": 1,
                "visibility": "shared",
            },
            {
                "id": 2,
                "source_type": "external",
                "stage": "technical_interview",
                "technical_questions": "Round 1: Low-level design of cache with eviction.",
                "takeaways": None,
                "offer_details": None,
                "author": "LeetCode Discuss",
                "verified_applicant": False,
                "url": "https://leetcode.com/discuss/interview-experience/12345",
                "created_at": "2026-09-01 10:00:00",
                "author_user_id": None,
                "visibility": "shared",
            },
        ]

        db = DatabaseManager()
        results = db.get_merged_experiences(company_id=1)

        self.assertEqual(len(results), 2)
        # Community item
        self.assertEqual(results[0]["source_type"], "community")
        self.assertEqual(results[0]["author"], "Anonymous")
        self.assertTrue(results[0]["verified_applicant"])
        self.assertIsNone(results[0]["url"])

        # External item
        self.assertEqual(results[1]["source_type"], "external")
        self.assertEqual(results[1]["author"], "LeetCode Discuss")
        self.assertFalse(results[1]["verified_applicant"])
        self.assertEqual(results[1]["url"], "https://leetcode.com/discuss/interview-experience/12345")

    # =========================================================================
    # FastAPI API Route Tests
    # =========================================================================

    @patch("src.db.db_manager.DatabaseManager.get_merged_experiences")
    def test_api_get_experiences(self, mock_get_merged):
        """Verify GET /companies/{company_id}/experiences returns merged list."""
        mock_get_merged.return_value = [
            {
                "id": 10,
                "source_type": "community",
                "stage": "oa",
                "technical_questions": "Question 1",
                "author": "Jordan Lee",
                "verified_applicant": True,
                "url": None,
            }
        ]
        resp = self.client.get("/companies/1/experiences")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["author"], "Jordan Lee")

    @patch("src.db.db_manager.DatabaseManager.save_experience_log")
    def test_api_save_experience_rejects_without_nda_ack(self, mock_save):
        """Verify POST /companies/{company_id}/experiences rejects shared log without NDA ack."""
        payload = {
            "stage": "oa",
            "technical_questions": "Test Question",
            "visibility": "shared",
            "confidentiality_ack": False,
        }
        resp = self.client.post("/companies/1/experiences", json=payload)
        self.assertEqual(resp.status_code, 400)
        self.assertIn("confidentiality agreement", resp.json()["detail"])

    @patch("src.db.db_manager.DatabaseManager.save_experience_log")
    def test_api_save_experience_success(self, mock_save):
        """Verify POST /companies/{company_id}/experiences saves valid experience log."""
        mock_save.return_value = {
            "id": 15,
            "company_id": 1,
            "stage": "oa",
            "technical_questions": "Test Question",
            "visibility": "shared",
            "confidentiality_ack": True,
        }
        payload = {
            "stage": "oa",
            "technical_questions": "Test Question",
            "visibility": "shared",
            "confidentiality_ack": True,
        }
        resp = self.client.post("/companies/1/experiences", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["experience_log"]["id"], 15)

    @patch("src.db.db_manager.DatabaseManager.delete_experience_log")
    def test_api_delete_experience(self, mock_delete):
        """Verify DELETE /experiences/{log_id} deletes experience log."""
        mock_delete.return_value = True
        resp = self.client.delete("/experiences/15")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "ok")

    @patch("src.pipeline.prep_service.get_curated_company_prep")
    def test_api_fetch_prep(self, mock_get_prep):
        """Verify POST /companies/{company_id}/fetch-prep returns curated prep debriefs."""
        mock_get_prep.return_value = {
            "status": "ok",
            "company_name": "Citadel",
            "count": 2,
            "items": [
                {
                    "id": 1,
                    "company_id": 1,
                    "stage": "oa",
                    "title": "Citadel OA",
                    "snippet": "HackerRank 2 Hard Qs",
                    "source": "LeetCode Discuss",
                    "url": "https://leetcode.com/discuss/123",
                }
            ],
        }
        resp = self.client.post("/companies/1/fetch-prep")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["fetched_count"], 2)


if __name__ == "__main__":
    unittest.main()

