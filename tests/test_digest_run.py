"""Unit tests for the Argus /digest/run endpoint and Resend integration."""
import os
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from src.pipeline.api import app
from src.pipeline.notification_service import send_resend_digest
from src.db.db_manager import DatabaseManager


class TestDigestRunEndpoint(unittest.TestCase):
    """Test suite for production scheduled digest runner and Resend integration."""

    def setUp(self):
        self.client = TestClient(app)

    @patch("src.db.db_manager.DatabaseManager.reclassify_all_postings")
    @patch("src.pipeline.notification_service.send_digest_notification")
    @patch("src.pipeline.api.run_all")
    def test_digest_run_success_post_method(self, mock_run_all, mock_send_digest, mock_reclass):
        mock_run_all.return_value = [
            {
                "company": "Citadel",
                "status": "success",
                "new_postings": 3,
                "relevant_postings": 2,
                "updated_postings": 0,
                "active_postings": 5,
                "closed_postings": 0,
                "snapshot_id": 201,
            }
        ]
        mock_send_digest.return_value = {
            "status": "ok",
            "message": "Successfully sent digest for 2 job(s) to candidate@example.com.",
            "count": 2,
            "resend_id": "res_prod_test_456",
            "notified_ids": [201, 202],
        }

        resp = self.client.post("/digest/run", json={"to_email": "candidate@example.com"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["companies_checked"], 1)
        self.assertEqual(data["successful_count"], 1)
        self.assertEqual(data["new_postings_count"], 3)
        self.assertEqual(data["new_relevant_count"], 2)
        self.assertTrue(data["digest_sent"])
        self.assertEqual(data["digest_count"], 2)
        self.assertEqual(data["notified_ids"], [201, 202])
        self.assertEqual(data["resend_id"], "res_prod_test_456")
        mock_run_all.assert_called_once()
        mock_send_digest.assert_called_once()

    @patch("src.db.db_manager.DatabaseManager.reclassify_all_postings")
    @patch("src.pipeline.notification_service.send_digest_notification")
    @patch("src.pipeline.api.run_all")
    def test_digest_run_get_method(self, mock_run_all, mock_send_digest, mock_reclass):
        mock_run_all.return_value = []
        mock_send_digest.return_value = {
            "status": "ok",
            "message": "No new unnotified postings matching your preferences found.",
            "count": 0,
            "notified_ids": [],
        }

        resp = self.client.get("/digest/run")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "ok")
        self.assertFalse(data["digest_sent"])
        self.assertEqual(data["digest_count"], 0)

    @patch.dict(os.environ, {"CRON_SECRET": "argus_secure_token_999"})
    @patch("src.db.db_manager.DatabaseManager.reclassify_all_postings")
    @patch("src.pipeline.notification_service.send_digest_notification")
    @patch("src.pipeline.api.run_all")
    def test_digest_run_cron_secret_auth(self, mock_run_all, mock_send_digest, mock_reclass):
        mock_run_all.return_value = []
        mock_send_digest.return_value = {"status": "ok", "count": 0, "message": "None"}

        # Missing auth header -> 401
        unauthorized_resp = self.client.post("/digest/run")
        self.assertEqual(unauthorized_resp.status_code, 401)

        # Invalid token -> 401
        invalid_resp = self.client.post(
            "/digest/run",
            headers={"Authorization": "Bearer wrong_token"}
        )
        self.assertEqual(invalid_resp.status_code, 401)

        # Valid Bearer token -> 200
        valid_bearer_resp = self.client.post(
            "/digest/run",
            headers={"Authorization": "Bearer argus_secure_token_999"}
        )
        self.assertEqual(valid_bearer_resp.status_code, 200)

        # Valid X-Cron-Secret header -> 200
        valid_custom_header_resp = self.client.post(
            "/digest/run",
            headers={"X-Cron-Secret": "argus_secure_token_999"}
        )
        self.assertEqual(valid_custom_header_resp.status_code, 200)

    def test_send_resend_digest_dev_mode(self):
        with patch.dict(os.environ, {"RESEND_API_KEY": ""}):
            res = send_resend_digest(
                to_email="dev@example.com",
                html_content="<p>Test</p>",
            )
            self.assertEqual(res["status"], "ok")
            self.assertTrue(res.get("dev_mode"))
            self.assertEqual(res["resend_id"], "dev_mock_id")

    @patch("requests.post")
    def test_send_resend_digest_live_api(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"id": "res_live_xyz_123"}
        mock_post.return_value = mock_resp

        res = send_resend_digest(
            to_email="candidate@example.com",
            html_content="<h1>New Jobs</h1>",
            api_key="re_live_real_key",
        )
        self.assertEqual(res["status"], "ok")
        self.assertEqual(res["resend_id"], "res_live_xyz_123")
        mock_post.assert_called_once()

    def test_claim_and_mark_unnotified_postings_sql_structure(self):
        db = DatabaseManager()
        mock_conn = MagicMock()
        mock_conn.__enter__.return_value = mock_conn
        mock_cur = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur
        mock_cur.fetchall.return_value = [
            {
                "id": 55,
                "company_id": 1,
                "external_id": "ext-55",
                "title": "Systems Software Engineer",
                "team": "Infrastructure",
                "deadline": None,
                "url": "https://company.com/job/55",
                "first_seen_at": "2026-09-20",
                "last_seen_at": "2026-09-20",
                "raw_json": {"location": "Remote"},
                "status": "new",
                "relevant": True,
                "notified_at": None,
                "company_name": "Stripe",
                "ats_type": "greenhouse",
                "careers_page_url": "https://stripe.com/jobs",
            }
        ]

        with patch.object(db, "get_connection", return_value=mock_conn):
            claimed = db.claim_and_mark_unnotified_postings(limit=10)
            self.assertEqual(len(claimed), 1)
            self.assertEqual(claimed[0]["id"], 55)

            # Check that the SELECT query requested FOR UPDATE OF p SKIP LOCKED
            select_call = mock_cur.execute.call_args_list[0]
            self.assertIn("FOR UPDATE OF p SKIP LOCKED", select_call[0][0])

            # Check that UPDATE postings SET notified_at = NOW() was executed
            update_call = mock_cur.execute.call_args_list[1]
            self.assertIn("UPDATE postings", update_call[0][0])
            self.assertIn("SET notified_at = NOW()", update_call[0][0])


if __name__ == "__main__":
    unittest.main()
