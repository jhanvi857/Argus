"""Unit tests for Argus email verification, OTP management, and authenticated login."""
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from src.auth.email_verification import (
    validate_email_format,
    generate_otp,
    send_verification_otp,
    verify_otp_and_register,
    _pending_verifications,
    _store_lock,
)
from src.pipeline.api import app


class TestEmailVerification(unittest.TestCase):
    """Test suite for email validation and OTP verification service."""

    def setUp(self):
        with _store_lock:
            _pending_verifications.clear()

    def test_validate_email_valid_formats(self):
        valid_emails = [
            "candidate@gmail.com",
            "jane.doe@outlook.com",
            "engineer@mit.edu",
            "swe.intern@domain.co.uk",
        ]
        for email in valid_emails:
            is_valid, msg = validate_email_format(email)
            self.assertTrue(is_valid, f"Expected {email} to be valid, got: {msg}")

    def test_validate_email_rejects_malformed_formats(self):
        invalid_emails = [
            "",
            "plainaddress",
            "@missingusername.com",
            "username@.com",
            "username@com",
            "spaces in@domain.com",
        ]
        for email in invalid_emails:
            is_valid, msg = validate_email_format(email)
            self.assertFalse(is_valid, f"Expected {email} to be invalid")
            self.assertTrue(len(msg) > 0)

    def test_validate_email_rejects_disposable_and_dummy_domains(self):
        dummy_emails = [
            "someone@tempmail.com",
            "someone@mailinator.com",
            "user@10minutemail.com",
            "person@throwawaymail.com",
            "candidate@example.com",
            "candidate@test.com",
        ]
        for email in dummy_emails:
            is_valid, msg = validate_email_format(email)
            self.assertFalse(is_valid, f"Expected dummy email {email} to be blocked")
            self.assertIn("not allowed", msg.lower())

    def test_validate_email_rejects_dummy_usernames(self):
        dummy_users = [
            "dummy@gmail.com",
            "test@gmail.com",
            "fake@yahoo.com",
        ]
        for email in dummy_users:
            is_valid, msg = validate_email_format(email)
            self.assertFalse(is_valid, f"Expected dummy username {email} to be blocked")

    def test_generate_otp_is_six_digit_numeric(self):
        for _ in range(20):
            otp = generate_otp()
            self.assertEqual(len(otp), 6)
            self.assertTrue(otp.isdigit())
            self.assertTrue(100000 <= int(otp) <= 999999)

    @patch("src.auth.email_verification.send_smtp_email")
    def test_send_verification_otp_success(self, mock_smtp):
        mock_smtp.return_value = True
        res = send_verification_otp("candidate@gmail.com", "John Doe")
        self.assertEqual(res["status"], "ok")
        self.assertEqual(res["email"], "candidate@gmail.com")

        with _store_lock:
            self.assertIn("candidate@gmail.com", _pending_verifications)
            record = _pending_verifications["candidate@gmail.com"]
            self.assertEqual(record["full_name"], "John Doe")
            self.assertEqual(len(record["otp_code"]), 6)

    def test_verify_otp_rejects_missing_request(self):
        mock_db = MagicMock()
        res = verify_otp_and_register("nonexistent@gmail.com", "123456", db=mock_db)
        self.assertEqual(res["status"], "error")
        self.assertIn("no verification request", res["message"].lower())
        mock_db.create_user.assert_not_called()

    def test_verify_otp_rejects_wrong_code(self):
        mock_db = MagicMock()
        with _store_lock:
            _pending_verifications["candidate@gmail.com"] = {
                "otp_code": "654321",
                "full_name": "Alice",
                "expires_at": 9999999999.0,
                "attempts": 0,
            }

        res = verify_otp_and_register("candidate@gmail.com", "000000", db=mock_db)
        self.assertEqual(res["status"], "error")
        self.assertIn("invalid verification code", res["message"].lower())
        mock_db.create_user.assert_not_called()

    def test_verify_otp_rejects_expired_code(self):
        mock_db = MagicMock()
        with _store_lock:
            _pending_verifications["candidate@gmail.com"] = {
                "otp_code": "654321",
                "full_name": "Alice",
                "expires_at": 100.0,  # Far in the past
                "attempts": 0,
            }

        res = verify_otp_and_register("candidate@gmail.com", "654321", db=mock_db)
        self.assertEqual(res["status"], "error")
        self.assertIn("expired", res["message"].lower())
        mock_db.create_user.assert_not_called()

    def test_verify_otp_success_inserts_user_into_db(self):
        """CRITICAL: Verifies user is ONLY inserted into database upon successful OTP verification."""
        mock_db = MagicMock()
        mock_db.create_user.return_value = {
            "id": 42,
            "name": "Alice Bob",
            "email": "candidate@gmail.com",
            "is_active": True,
        }

        with _store_lock:
            _pending_verifications["candidate@gmail.com"] = {
                "otp_code": "654321",
                "full_name": "Alice Bob",
                "expires_at": 9999999999.0,
                "attempts": 0,
            }

        res = verify_otp_and_register("candidate@gmail.com", "654321", db=mock_db)
        self.assertEqual(res["status"], "ok")
        self.assertIn("user", res)
        self.assertEqual(res["user"]["id"], 42)
        self.assertEqual(res["user"]["email"], "candidate@gmail.com")

        # Confirm user was inserted into DB
        mock_db.create_user.assert_called_once_with(name="Alice Bob", email="candidate@gmail.com")

        # Confirm pending entry was cleaned up
        with _store_lock:
            self.assertNotIn("candidate@gmail.com", _pending_verifications)


class TestAuthAPIEndpoints(unittest.TestCase):
    """Test suite for FastAPI Auth endpoints."""

    def setUp(self):
        self.client = TestClient(app)
        with _store_lock:
            _pending_verifications.clear()

    @patch("src.auth.email_verification.send_smtp_email")
    def test_api_send_otp_endpoint(self, mock_smtp):
        mock_smtp.return_value = True
        response = self.client.post(
            "/auth/send-otp",
            json={"email": "candidate@gmail.com", "full_name": "Charlie"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["email"], "candidate@gmail.com")

    def test_api_send_otp_rejects_dummy_email(self):
        response = self.client.post(
            "/auth/send-otp",
            json={"email": "fake@tempmail.com", "full_name": "Hacker"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("not allowed", response.json()["detail"].lower())

    @patch("src.db.db_manager.DatabaseManager.create_user")
    def test_api_verify_otp_endpoint(self, mock_create):
        mock_create.return_value = {
            "id": 99,
            "name": "Verified Candidate",
            "email": "verified@gmail.com",
            "is_active": True,
        }

        with _store_lock:
            _pending_verifications["verified@gmail.com"] = {
                "otp_code": "888999",
                "full_name": "Verified Candidate",
                "expires_at": 9999999999.0,
                "attempts": 0,
            }

        response = self.client.post(
            "/auth/verify-otp",
            json={"email": "verified@gmail.com", "otp_code": "888999"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["user"]["id"], 99)

    @patch("src.db.db_manager.DatabaseManager.get_user_by_email")
    def test_api_login_rejects_unverified_user(self, mock_get_user):
        """Verify unverified/dummy user cannot log in."""
        mock_get_user.return_value = None
        response = self.client.post(
            "/auth/login",
            json={"email": "unverified@gmail.com"},
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn("no verified account", response.json()["detail"].lower())

    @patch("src.db.db_manager.DatabaseManager.get_user_by_email")
    def test_api_login_accepts_verified_user(self, mock_get_user):
        """Verify verified user in DB can log in."""
        mock_get_user.return_value = {
            "id": 1,
            "name": "Legit User",
            "email": "legit@gmail.com",
            "is_active": True,
        }
        response = self.client.post(
            "/auth/login",
            json={"email": "legit@gmail.com"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["user"]["email"], "legit@gmail.com")


if __name__ == "__main__":
    unittest.main()
