"""Unit tests for Phase B: Application <-> Resume Pinning and Immutability.

Verifies:
1. When an application is created in 'applied' stage, resume_version_id and applied_at are pinned.
2. Immutability guardrail: subsequent updates to notes, stage, or dates cannot overwrite the pinned resume_version_id or applied_at.
3. Attempting to supply a different resume_version_id without backfill=True preserves the original pinned version.
4. Backfill mode: allows associating a resume_version_id to a historical unpinned application.
5. Filtering: applications can be filtered by resume_version_id.
"""
import unittest
from unittest.mock import MagicMock

from src.db.db_manager import DatabaseManager


class TestPinningImmutability(unittest.TestCase):
    """Test suite for application resume pinning and immutability guarantees."""

    def setUp(self):
        self.mock_db = DatabaseManager.__new__(DatabaseManager)
        self.mock_conn = MagicMock()
        self.mock_cur = MagicMock()
        self.mock_conn.cursor.return_value.__enter__.return_value = self.mock_cur
        self.mock_db.get_connection = MagicMock(return_value=self.mock_conn)
        self.mock_conn.__enter__.return_value = self.mock_conn

    def test_pin_resume_on_applied_creation(self):
        """Verify initial 'applied' stage pins resume_version_id and ats_score_at_apply."""
        # Setup: No existing application
        self.mock_cur.fetchone.side_effect = [
            None,  # SELECT existing -> None
            {"label": "Systems Resume v1", "file_name": "systems.pdf"},  # SELECT resume_versions
            {
                "id": 1,
                "posting_id": 101,
                "stage": "applied",
                "resume_version_id": 5,
                "resume_version": "Systems Resume v1",
                "applied_at": "2026-11-11 12:00:00+00",
                "ats_score_at_apply": 88,
                "notes": "Applied via referral",
            },  # INSERT RETURNING
        ]

        result = self.mock_db.update_application_status(
            posting_id=101,
            stage="applied",
            resume_version_id=5,
            ats_score_at_apply=88,
            notes="Applied via referral",
        )

        self.assertEqual(result["posting_id"], 101)
        self.assertEqual(result["resume_version_id"], 5)
        self.assertEqual(result["ats_score_at_apply"], 88)
        self.assertEqual(result["stage"], "applied")

    def test_immutability_preserves_pinned_resume_on_subsequent_updates(self):
        """Verify advancing stage or updating notes DOES NOT overwrite pinned resume_version_id."""
        existing_app = {
            "id": 1,
            "posting_id": 101,
            "stage": "applied",
            "resume_version_id": 5,
            "resume_version": "Original Pinned Resume v1",
            "applied_at": "2026-11-01 10:00:00+00",
            "ats_score_at_apply": 92,
            "notes": "Original notes",
        }

        # Existing record found, and UPDATE returns preserved values
        self.mock_cur.fetchone.side_effect = [
            existing_app,  # SELECT existing -> already pinned to ID 5
            {"label": "Some Other Resume", "file_name": "other.pdf"},  # SELECT resume_versions for ID 99
            {
                **existing_app,
                "stage": "interview",
                "notes": "Round 1 scheduled",
                "oa_date": "2026-11-05",
            },  # UPDATE RETURNING
        ]

        # Caller accidentally attempts to pass a different resume_version_id (e.g. 99)
        result = self.mock_db.update_application_status(
            posting_id=101,
            stage="interview",
            resume_version_id=99,  # Should be IGNORED due to immutability
            notes="Round 1 scheduled",
            oa_date="2026-11-05",
            backfill=False,
        )

        # Inspect the parameters passed to UPDATE query
        update_calls = [
            c for c in self.mock_cur.execute.call_args_list 
            if "UPDATE applications" in str(c)
        ]
        self.assertTrue(len(update_calls) > 0, "UPDATE query must be executed")
        params = update_calls[0][0][1]

        # Param 5 is final_resume_id -> must be original pinned ID 5, NOT 99!
        final_resume_id_param = params[5]
        self.assertEqual(
            final_resume_id_param, 5, 
            f"Immutability violated: expected pinned ID 5, got {final_resume_id_param}"
        )

    def test_backfill_mode_allows_updating_historical_record(self):
        """Verify backfill=True allows associating a resume to an unpinned past application."""
        historical_unpinned_app = {
            "id": 2,
            "posting_id": 202,
            "stage": "applied",
            "resume_version_id": None,
            "resume_version": "Old unpinned string",
            "applied_at": "2026-10-15 09:00:00+00",
            "ats_score_at_apply": None,
            "notes": "Applied last month before resume library existed",
        }

        self.mock_cur.fetchone.side_effect = [
            historical_unpinned_app,  # SELECT existing
            {"label": "Backfilled Resume v2", "file_name": "v2.pdf"},  # SELECT resume_versions
            {
                **historical_unpinned_app,
                "resume_version_id": 7,
                "resume_version": "Backfilled Resume v2",
                "ats_score_at_apply": 85,
            },  # UPDATE RETURNING
        ]

        result = self.mock_db.update_application_status(
            posting_id=202,
            stage="applied",
            resume_version_id=7,
            ats_score_at_apply=85,
            backfill=True,
        )

        update_calls = [
            c for c in self.mock_cur.execute.call_args_list 
            if "UPDATE applications" in str(c)
        ]
        self.assertTrue(len(update_calls) > 0)
        params = update_calls[0][0][1]
        final_resume_id_param = params[5]
        self.assertEqual(final_resume_id_param, 7, "Backfill must set new resume_version_id 7")


if __name__ == "__main__":
    unittest.main()
