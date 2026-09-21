"""Unit tests for user preference filtering across database, classifier, and notifications."""
import unittest
from unittest.mock import patch, MagicMock

from src.classifier.relevance import RelevanceClassifier
from src.pipeline.notification_service import send_digest_notification


class TestPreferenceFiltering(unittest.TestCase):
    """Test suite ensuring user preferences (location, role level, companies) strictly filter postings."""

    def setUp(self):
        self.postings = [
            {
                "id": 1,
                "title": "Software Development Engineer Intern - 2026",
                "company_id": 10,
                "company_name": "Amazon",
                "team": "Robotics",
                "raw_json": {"location": "Bengaluru, India"},
                "location": "Bengaluru, India",
                "url": "https://amazon.jobs/1",
            },
            {
                "id": 2,
                "title": "Software Development Engineer Intern - 2026",
                "company_id": 10,
                "company_name": "Amazon",
                "team": "AWS",
                "raw_json": {"location": "Seattle, WA, US"},
                "location": "Seattle, WA, US",
                "url": "https://amazon.jobs/2",
            },
            {
                "id": 3,
                "title": "New Grad Software Engineer (2026)",
                "company_id": 20,
                "company_name": "Google",
                "team": "Search",
                "raw_json": {"location": "Hyderabad, India"},
                "location": "Hyderabad, India",
                "url": "https://google.jobs/3",
            },
            {
                "id": 4,
                "title": "New Grad Software Engineer (2026)",
                "company_id": 20,
                "company_name": "Google",
                "team": "Cloud",
                "raw_json": {"location": "New York, NY, US"},
                "location": "New York, NY, US",
                "url": "https://google.jobs/4",
            },
        ]

    def test_location_filtering_india_only(self):
        # India intern should only match posting 1
        res1 = RelevanceClassifier.classify(
            title=self.postings[0]["title"],
            team=self.postings[0]["team"],
            location=self.postings[0]["location"],
            role_level="intern",
            target_locations=["India"],
        )
        self.assertTrue(res1.relevant)

        # US intern should be rejected by India location filter
        res2 = RelevanceClassifier.classify(
            title=self.postings[1]["title"],
            team=self.postings[1]["team"],
            location=self.postings[1]["location"],
            role_level="intern",
            target_locations=["India"],
        )
        self.assertFalse(res2.relevant)
        self.assertIn("does not match target locations", res2.rationale)

    def test_role_level_filtering_intern_vs_new_grad(self):
        # India new grad should be rejected when role_level is intern
        res3 = RelevanceClassifier.classify(
            title=self.postings[2]["title"],
            team=self.postings[2]["team"],
            location=self.postings[2]["location"],
            role_level="intern",
            target_locations=["India"],
        )
        self.assertFalse(res3.relevant)
        self.assertIn("user preference is Intern only", res3.rationale)

        # India new grad should match when role_level is new_grad
        res3_ng = RelevanceClassifier.classify(
            title=self.postings[2]["title"],
            team=self.postings[2]["team"],
            location=self.postings[2]["location"],
            role_level="new_grad",
            target_locations=["India"],
        )
        self.assertTrue(res3_ng.relevant)

    @patch("requests.post")
    def test_send_digest_notification_filtered_by_preferences(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": "res_pref_test_123"}
        mock_post.return_value = mock_response

        mock_db = MagicMock()
        mock_db.get_user_preferences.return_value = {
            "locations": ["India"],
            "role_level": "intern",
            "target_roles": ["Internships"],
            "email_notifications_enabled": True,
        }
        # Simulate db returning postings matching India/intern preferences
        mock_db.get_pending_notifications.return_value = [self.postings[0]]

        res = send_digest_notification(to_email="test@example.com", db_manager=mock_db)
        self.assertEqual(res["status"], "ok")
        self.assertEqual(res["count"], 1)
        self.assertEqual(res["notified_ids"], [1])
        mock_db.mark_postings_notified.assert_called_once_with([1])


if __name__ == "__main__":
    unittest.main()
