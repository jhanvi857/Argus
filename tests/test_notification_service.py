"""Unit tests for Argus Resend notification service and API endpoints."""
import os
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from src.pipeline.notification_service import (
    build_digest_html,
    send_digest_notification,
)
from src.pipeline.api import app


class TestNotificationService(unittest.TestCase):
    """Test suite for Resend email digest notification service."""

    def setUp(self):
        self.mock_postings = [
            {
                "id": 101,
                "title": "Software Engineer Intern - Systems",
                "company_name": "Google",
                "team": "Core Infrastructure",
                "deadline": "2026-10-15",
                "url": "https://careers.google.com/jobs/results/101",
                "location": "Mountain View, CA",
            },
            {
                "id": 102,
                "title": "Quantitative Trader Intern",
                "company_name": "Citadel",
                "team": "Global Quantitative Strategies",
                "deadline": "Rolling",
                "url": "https://www.citadel.com/careers/jobs/102",
                "location": "New York, NY",
            },
        ]

    def test_build_digest_html_contains_job_details(self):
        html = build_digest_html(self.mock_postings)
        self.assertIn("Argus", html)
        self.assertIn("Software Engineer Intern - Systems", html)
        self.assertIn("Google", html)
        self.assertIn("Citadel", html)
        self.assertIn("https://careers.google.com/jobs/results/101", html)
        self.assertIn("New Relevant Openings Detected (2)", html)

    def test_send_digest_notification_empty_when_no_postings(self):
        mock_db = MagicMock()
        mock_db.get_pending_notifications.return_value = []

        res = send_digest_notification(to_email="test@example.com", db_manager=mock_db)
        self.assertEqual(res["status"], "ok")
        self.assertEqual(res["count"], 0)
        self.assertIn("no new", res["message"].lower())
        mock_db.mark_postings_notified.assert_not_called()

    @patch("requests.post")
    def test_send_digest_notification_resend_api_success(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": "res_abc123456"}
        mock_post.return_value = mock_response

        mock_db = MagicMock()
        mock_db.get_pending_notifications.return_value = self.mock_postings

        with patch.dict(os.environ, {"RESEND_API_KEY": "re_live_test_key_123"}):
            res = send_digest_notification(to_email="verified@example.com", db_manager=mock_db)

        self.assertEqual(res["status"], "ok")
        self.assertEqual(res["count"], 2)
        self.assertEqual(res["resend_id"], "res_abc123456")
        mock_db.mark_postings_notified.assert_called_once_with([101, 102])
        mock_post.assert_called_once()

    def test_send_digest_notification_dev_mode_without_key(self):
        mock_db = MagicMock()
        mock_db.get_pending_notifications.return_value = self.mock_postings

        with patch.dict(os.environ, {"RESEND_API_KEY": ""}):
            res = send_digest_notification(to_email="verified@example.com", db_manager=mock_db)

        self.assertEqual(res["status"], "ok")
        self.assertEqual(res["count"], 2)
        self.assertTrue(res.get("dev_mode"))
        mock_db.mark_postings_notified.assert_called_once_with([101, 102])


class TestNotificationEndpoints(unittest.TestCase):
    """Test suite for /notifications endpoints."""

    def setUp(self):
        self.client = TestClient(app)

    @patch("src.pipeline.notification_service.send_digest_notification")
    def test_post_send_digest_endpoint(self, mock_send):
        mock_send.return_value = {
            "status": "ok",
            "message": "Successfully sent digest for 2 job(s).",
            "count": 2,
        }
        resp = self.client.post("/notifications/send-digest", json={"to_email": "candidate@gmail.com"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["count"], 2)

    @patch("src.db.db_manager.DatabaseManager.get_notification_stats")
    def test_get_notification_stats_endpoint(self, mock_stats):
        mock_stats.return_value = {
            "total_postings": 40,
            "relevant_postings": 15,
            "notified_postings": 10,
            "pending_notifications": 5,
        }
        resp = self.client.get("/notifications/stats")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["pending_notifications"], 5)


if __name__ == "__main__":
    unittest.main()
