"""Unit tests for ATS adapters (Greenhouse, Lever, BaseAdapter, and Registry)."""
import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime

from src.adapters.models import ExtractedPosting
from src.adapters.base import BaseAdapter, DEFAULT_HEADERS
from src.adapters.greenhouse import GreenhouseAdapter
from src.adapters.lever import LeverAdapter
from src.adapters.registry import get_adapter, register_adapter, ADAPTER_MAP
from src.db.models import Posting


class TestAdapters(unittest.TestCase):
    """Test suite for ATS adapter implementations and registry."""

    def test_extracted_posting_to_db_posting(self):
        """Verify ExtractedPosting conversion into database Posting model."""
        ep = ExtractedPosting(
            external_id="gh-9876",
            title="Systems Engineer Intern",
            url="https://boards.greenhouse.io/stripe/jobs/9876",
            team="Core Infrastructure",
            location="Bengaluru, India",
            deadline=datetime(2026, 9, 15, 12, 0),
            raw_json={"id": 9876, "title": "Systems Engineer Intern"},
        )
        db_p = ep.to_db_posting(company_id=42)

        self.assertIsInstance(db_p, Posting)
        self.assertEqual(db_p.company_id, 42)
        self.assertEqual(db_p.external_id, "gh-9876")
        self.assertEqual(db_p.title, "Systems Engineer Intern")
        self.assertEqual(db_p.team, "Core Infrastructure")
        self.assertEqual(db_p.status, "new")
        self.assertIsNone(db_p.relevant)
        self.assertIsNone(db_p.notified_at)

    def test_greenhouse_token_extraction(self):
        """Verify extraction of board token across various URL formats."""
        # 1. Standard careers URL
        gh1 = GreenhouseAdapter("Stripe", "https://boards.greenhouse.io/stripe")
        self.assertEqual(gh1.board_token, "stripe")
        self.assertEqual(
            gh1.get_api_endpoint(),
            "https://boards-api.greenhouse.io/v1/boards/stripe/jobs?content=true",
        )

        # 2. Explicit ATS URL with boards-api
        gh2 = GreenhouseAdapter(
            "Figma",
            "https://www.figma.com/careers",
            ats_url="https://boards-api.greenhouse.io/v1/boards/figma/jobs",
        )
        self.assertEqual(gh2.board_token, "figma")
        self.assertEqual(
            gh2.get_api_endpoint(),
            "https://boards-api.greenhouse.io/v1/boards/figma/jobs",
        )

        # 3. Fallback from company name
        gh3 = GreenhouseAdapter("Postman API Tooling", "https://postman.com/careers")
        self.assertEqual(gh3.board_token, "postmanapitooling")

    def test_greenhouse_parse_postings(self):
        """Verify parsing of realistic Greenhouse JSON payload."""
        sample_payload = {
            "jobs": [
                {
                    "id": 101,
                    "title": "Software Engineering Intern - Backend (Summer 2026)",
                    "absolute_url": "https://boards.greenhouse.io/stripe/jobs/101",
                    "location": {"name": "Bengaluru, Karnataka, India"},
                    "departments": [{"name": "Payments Infrastructure"}],
                    "updated_at": "2026-08-20T10:00:00Z",
                },
                {
                    "id": 102,
                    "title": "Data Platform Engineer",
                    "absolute_url": "https://boards.greenhouse.io/stripe/jobs/102",
                    "location": {"name": "Remote, India"},
                    "departments": [{"name": "Data Infrastructure"}],
                    "updated_at": "2026-08-22T14:30:00Z",
                },
                {
                    # Incomplete/empty job entry should be safely skipped
                    "id": None,
                    "title": "",
                },
            ]
        }

        adapter = GreenhouseAdapter("Stripe", "https://stripe.com/jobs", board_token="stripe")
        postings = adapter.parse_postings(sample_payload)

        self.assertEqual(len(postings), 2)
        self.assertEqual(postings[0].external_id, "101")
        self.assertEqual(postings[0].title, "Software Engineering Intern - Backend (Summer 2026)")
        self.assertEqual(postings[0].team, "Payments Infrastructure")
        self.assertEqual(postings[0].location, "Bengaluru, Karnataka, India")
        self.assertEqual(postings[0].url, "https://boards.greenhouse.io/stripe/jobs/101")
        self.assertIsNotNone(postings[0].deadline)

        self.assertEqual(postings[1].external_id, "102")
        self.assertEqual(postings[1].team, "Data Infrastructure")

    def test_lever_token_extraction_and_parsing(self):
        """Verify Lever site token extraction and JSON payload parsing."""
        # Token extraction
        lv = LeverAdapter("Postman", "https://jobs.lever.co/postman")
        self.assertEqual(lv.site_token, "postman")
        self.assertEqual(lv.get_api_endpoint(), "https://api.lever.co/v0/postings/postman?mode=json")

        # Parsing
        sample_payload = [
            {
                "id": "lev-77a",
                "text": "Infrastructure Engineer Intern",
                "hostedUrl": "https://jobs.lever.co/postman/lev-77a",
                "categories": {
                    "team": "Core Platform",
                    "location": "Bengaluru",
                    "commitment": "Full-time",
                },
                "createdAt": 1724000000000,
            }
        ]

        postings = lv.parse_postings(sample_payload)
        self.assertEqual(len(postings), 1)
        self.assertEqual(postings[0].external_id, "lev-77a")
        self.assertEqual(postings[0].title, "Infrastructure Engineer Intern")
        self.assertEqual(postings[0].team, "Core Platform")
        self.assertEqual(postings[0].location, "Bengaluru")
        self.assertEqual(postings[0].url, "https://jobs.lever.co/postman/lev-77a")

    @patch("requests.Session.get")
    def test_base_adapter_http_retry_and_backoff(self, mock_get):
        """Verify BaseAdapter handles rate limits and retries with backoff."""
        # 1st attempt: 429 Rate Limit
        # 2nd attempt: 200 OK
        resp_429 = MagicMock()
        resp_429.status_code = 429
        resp_429.headers = {"Retry-After": "0"}

        resp_200 = MagicMock()
        resp_200.status_code = 200
        resp_200.json.return_value = {"jobs": [{"id": 1, "title": "SWE"}]}

        mock_get.side_effect = [resp_429, resp_200]

        gh = GreenhouseAdapter("TestCo", "https://example.com/jobs", board_token="testco")
        result = gh.fetch_raw_payload()

        self.assertEqual(mock_get.call_count, 2)
        self.assertIn("jobs", result)
        self.assertEqual(len(result["jobs"]), 1)

    def test_adapter_registry(self):
        """Verify registry maps ats_type to correct adapter classes."""
        gh_adapter = get_adapter("Stripe", "https://stripe.com", ats_type="greenhouse")
        self.assertIsInstance(gh_adapter, GreenhouseAdapter)

        lv_adapter = get_adapter("Figma", "https://figma.com", ats_type="lever")
        self.assertIsInstance(lv_adapter, LeverAdapter)

        # URL based heuristic
        auto_gh = get_adapter("Acme", "https://boards.greenhouse.io/acme", ats_type="verify")
        self.assertIsInstance(auto_gh, GreenhouseAdapter)

        with self.assertRaises(ValueError):
            get_adapter("UnknownCo", "https://unknown.com", ats_type="unsupported_ats")


if __name__ == "__main__":
    unittest.main()
