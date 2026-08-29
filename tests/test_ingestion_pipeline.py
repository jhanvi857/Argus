"""Unit and integration tests for IngestionPipeline end-to-end flow."""
import unittest
from unittest.mock import MagicMock

from src.adapters.base import BaseAdapter
from src.adapters.models import ExtractedPosting
from src.db.models import Company, Posting
from src.pipeline.ingestion_service import IngestionPipeline, IngestionResult


class MockAdapter(BaseAdapter):
    """Mock ATS adapter for predictable test execution."""

    def __init__(self, raw_payload, postings):
        super().__init__("TestCo", "https://testco.com/careers")
        self._raw_payload = raw_payload
        self._postings = postings

    def fetch_raw_payload(self):
        return self._raw_payload

    def parse_postings(self, raw_payload):
        return self._postings


class TestIngestionPipeline(unittest.TestCase):
    """Test suite verifying end-to-end ingestion pipeline execution."""

    def setUp(self):
        self.mock_db = MagicMock()
        self.pipeline = IngestionPipeline(db_manager=self.mock_db)

        self.company = Company(
            id=10,
            name="Stripe",
            ats_type="greenhouse",
            careers_page_url="https://stripe.com/jobs",
        )

        self.mock_db.get_company_by_name.return_value = self.company
        self.mock_db.get_company_by_id.return_value = self.company
        self.mock_db.create_snapshot.return_value = 501
        self.mock_db.insert_new_postings.return_value = [1, 2]

    def test_pipeline_first_run_all_new_postings(self):
        """Verify pipeline flow when all postings are new on initial scrape."""
        # Existing in DB: 0 postings
        self.mock_db.get_postings_for_company.return_value = []

        mock_payload = {"jobs": [{"id": 1}, {"id": 2}]}
        extracted = [
            ExtractedPosting(
                external_id="1",
                title="SWE Intern - Backend",
                url="https://stripe.com/jobs/1",
                team="Payments",
            ),
            ExtractedPosting(
                external_id="2",
                title="SWE Intern - Systems",
                url="https://stripe.com/jobs/2",
                team="Infrastructure",
            ),
        ]
        mock_adapter = MockAdapter(mock_payload, extracted)

        result = self.pipeline.run_for_company(self.company, adapter=mock_adapter)

        # 1. Snapshot created
        self.mock_db.create_snapshot.assert_called_once_with(10, mock_payload)

        # 2. Existing postings queried
        self.mock_db.get_postings_for_company.assert_called_once_with(10)

        # 3. New postings inserted with relevance flags
        self.mock_db.insert_new_postings.assert_called_once_with(10, extracted, relevant_flags=[True, True])

        # 4. Company last checked updated
        self.mock_db.update_company_last_checked.assert_called_once_with(10)

        # 5. Ingestion result verified
        self.assertEqual(result.company_id, 10)
        self.assertEqual(result.snapshot_id, 501)
        self.assertEqual(result.new_count, 2)
        self.assertEqual(result.relevant_count, 2)
        self.assertEqual(result.updated_count, 0)
        self.assertEqual(result.unchanged_count, 0)
        self.assertEqual(result.closed_count, 0)

    def test_pipeline_subsequent_run_with_updates_and_unchanged(self):
        """Verify pipeline flow when postings are unchanged or updated."""
        existing_db_postings = [
            Posting(
                id=1,
                company_id=10,
                external_id="1",
                title="SWE Intern - Backend",
                team="Payments",
                url="https://stripe.com/jobs/1",
            ),
            Posting(
                id=2,
                company_id=10,
                external_id="2",
                title="SWE Intern - Old Title",  # Will be updated
                team="Infrastructure",
                url="https://stripe.com/jobs/2",
            ),
        ]
        self.mock_db.get_postings_for_company.return_value = existing_db_postings

        mock_payload = {"jobs": [{"id": 1}, {"id": 2}]}
        extracted = [
            ExtractedPosting(
                external_id="1",
                title="SWE Intern - Backend",  # Unchanged
                url="https://stripe.com/jobs/1",
                team="Payments",
            ),
            ExtractedPosting(
                external_id="2",
                title="SWE Intern - Distributed Systems New",  # Updated
                url="https://stripe.com/jobs/2",
                team="Infrastructure",
            ),
        ]
        mock_adapter = MockAdapter(mock_payload, extracted)

        result = self.pipeline.run_for_company(self.company, adapter=mock_adapter)

        # No new postings inserted
        self.mock_db.insert_new_postings.assert_not_called()

        # Updated posting updated in DB
        self.mock_db.update_posting.assert_called_once_with(10, extracted[1])

        # Unchanged posting touched
        self.mock_db.update_postings_last_seen.assert_called_once_with(10, ["1"])

        # Result verification
        self.assertEqual(result.new_count, 0)
        self.assertEqual(result.updated_count, 1)
        self.assertEqual(result.unchanged_count, 1)
        self.assertEqual(result.closed_count, 0)

    def test_pipeline_closure_handling(self):
        """Verify pipeline marks removed postings as closed in database."""
        existing_db_postings = [
            Posting(
                id=1,
                company_id=10,
                external_id="1",
                title="SWE Intern - Backend",
                team="Payments",
                url="https://stripe.com/jobs/1",
            ),
            Posting(
                id=2,
                company_id=10,
                external_id="closed-999",
                title="Old Closed Role",
                team="Legacy",
                url="https://stripe.com/jobs/999",
            ),
        ]
        self.mock_db.get_postings_for_company.return_value = existing_db_postings
        self.mock_db.mark_postings_closed.return_value = 1

        mock_payload = {"jobs": [{"id": 1}]}
        extracted = [
            ExtractedPosting(
                external_id="1",
                title="SWE Intern - Backend",
                url="https://stripe.com/jobs/1",
                team="Payments",
            )
        ]
        mock_adapter = MockAdapter(mock_payload, extracted)

        result = self.pipeline.run_for_company(self.company, adapter=mock_adapter)

        # Closed posting marked in DB
        self.mock_db.mark_postings_closed.assert_called_once_with(10, ["closed-999"])
        self.assertEqual(result.closed_count, 1)
        self.assertEqual(result.unchanged_count, 1)


if __name__ == "__main__":
    unittest.main()

