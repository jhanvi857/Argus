"""Unit tests for DiffEngine and DiffResult."""
import unittest
from datetime import datetime

from src.adapters.models import ExtractedPosting
from src.db.models import Posting
from src.diff.diff_engine import DiffEngine, DiffResult


class TestDiffEngine(unittest.TestCase):
    """Test suite for differential engine extracting new, modified, and closed postings."""

    def setUp(self):
        self.sample_current_1 = ExtractedPosting(
            external_id="101",
            title="SWE Intern - Distributed Systems",
            url="https://careers.example.com/101",
            team="Infrastructure",
            location="Bengaluru",
        )
        self.sample_current_2 = ExtractedPosting(
            external_id="102",
            title="Fullstack Intern",
            url="https://careers.example.com/102",
            team="Growth",
            location="Hyderabad",
        )
        self.sample_current_3 = ExtractedPosting(
            external_id="103",
            title="Cloud Platform Engineer Intern",
            url="https://careers.example.com/103",
            team="Platform",
            location="Remote",
        )

    def test_first_scrape_all_new(self):
        """On initial scrape when DB has 0 postings, all postings must be classified as new."""
        previous_postings = []
        current_postings = [self.sample_current_1, self.sample_current_2]

        diff_res = DiffEngine.diff(previous_postings, current_postings)

        self.assertEqual(len(diff_res.new_postings), 2)
        self.assertEqual(len(diff_res.updated_postings), 0)
        self.assertEqual(len(diff_res.unchanged_postings), 0)
        self.assertEqual(len(diff_res.closed_external_ids), 0)
        self.assertTrue(diff_res.has_changes)
        self.assertEqual(diff_res.total_current_count, 2)

    def test_subsequent_scrape_no_changes(self):
        """When current scrape exactly matches stored postings, all are classified as unchanged."""
        previous_postings = [
            Posting(
                id=1,
                company_id=10,
                external_id="101",
                title="SWE Intern - Distributed Systems",
                team="Infrastructure",
                url="https://careers.example.com/101",
                status="new",
            ),
            Posting(
                id=2,
                company_id=10,
                external_id="102",
                title="Fullstack Intern",
                team="Growth",
                url="https://careers.example.com/102",
                status="new",
            ),
        ]
        current_postings = [self.sample_current_1, self.sample_current_2]

        diff_res = DiffEngine.diff(previous_postings, current_postings)

        self.assertEqual(len(diff_res.new_postings), 0)
        self.assertEqual(len(diff_res.updated_postings), 0)
        self.assertEqual(len(diff_res.unchanged_postings), 2)
        self.assertEqual(len(diff_res.closed_external_ids), 0)
        self.assertFalse(diff_res.has_changes)
        self.assertEqual(diff_res.total_current_count, 2)

    def test_mixed_diff_scenario(self):
        """Test concurrent new posting, modified title/team, unchanged, and closed posting."""
        # Stored in DB: 101 (unchanged), 102 (modified in scrape), 999 (removed from scrape)
        previous_postings = [
            Posting(
                id=1,
                company_id=10,
                external_id="101",
                title="SWE Intern - Distributed Systems",
                team="Infrastructure",
                url="https://careers.example.com/101",
            ),
            Posting(
                id=2,
                company_id=10,
                external_id="102",
                title="Fullstack Intern - Old Title",  # Will change
                team="Old Team",
                url="https://careers.example.com/102",
            ),
            Posting(
                id=3,
                company_id=10,
                external_id="999",  # Will be closed
                title="Closed Position",
                url="https://careers.example.com/999",
            ),
        ]

        # Current scrape: 101 (same), 102 (new title/team), 103 (new posting)
        current_postings = [self.sample_current_1, self.sample_current_2, self.sample_current_3]

        diff_res = DiffEngine.diff(previous_postings, current_postings)

        # 103 is new
        self.assertEqual(len(diff_res.new_postings), 1)
        self.assertEqual(diff_res.new_postings[0].external_id, "103")

        # 102 is updated
        self.assertEqual(len(diff_res.updated_postings), 1)
        self.assertEqual(diff_res.updated_postings[0].external_id, "102")

        # 101 is unchanged
        self.assertEqual(len(diff_res.unchanged_postings), 1)
        self.assertEqual(diff_res.unchanged_postings[0].external_id, "101")

        # 999 is closed
        self.assertEqual(diff_res.closed_external_ids, ["999"])
        self.assertTrue(diff_res.has_changes)
        self.assertEqual(diff_res.total_current_count, 3)


if __name__ == "__main__":
    unittest.main()
