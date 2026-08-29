"""Unit tests for early relevance classifier and role filtering."""
import unittest

from src.adapters.models import ExtractedPosting
from src.classifier.relevance import RelevanceClassifier, classify_posting


class TestRelevanceClassifier(unittest.TestCase):
    """Test suite for role relevance classification."""

    def test_relevant_swe_intern_postings(self):
        """Verify target SWE/Infra intern roles are tagged as relevant."""
        test_cases = [
            ("Software Engineering Intern - Backend", "Core Platform"),
            ("Systems Engineer Intern (Summer 2026)", "Infrastructure"),
            ("Cloud Infrastructure Intern", "Cloud Platform"),
            ("Quantitative Developer Intern", "Trading Systems"),
            ("Summer Analyst, Technology", "APAC Engineering"),
            ("SDE Intern - Distributed Storage", "Data Platform"),
            ("New Grad Software Engineer (2026)", "Backend Systems"),
        ]

        for title, team in test_cases:
            res = RelevanceClassifier.classify(title=title, team=team)
            self.assertTrue(
                res.relevant,
                f"Expected relevant=True for '{title}' (team: {team}), got {res.relevant}: {res.rationale}",
            )
            self.assertGreaterEqual(res.confidence, 0.8)

    def test_disqualify_senior_and_managerial_roles(self):
        """Verify senior, staff, lead, and managerial roles are disqualified."""
        disqualified_titles = [
            "Senior Software Engineer",
            "Staff Infrastructure Engineer",
            "Principal Distributed Systems Architect",
            "Engineering Manager - Backend",
            "Lead Cloud Engineer",
            "Director of Engineering",
            "VP of Infrastructure",
        ]

        for title in disqualified_titles:
            res = RelevanceClassifier.classify(title=title)
            self.assertFalse(
                res.relevant,
                f"Expected relevant=False for senior role '{title}', got {res.relevant}",
            )
            self.assertIn("anti-keyword", res.rationale.lower())

    def test_disqualify_non_technical_roles(self):
        """Verify non-technical roles (sales, hr, marketing, etc.) are disqualified."""
        disqualified_titles = [
            "Account Executive, AI Sales",
            "Marketing Specialist",
            "HR Operations Intern",
            "Talent Acquisition Coordinator",
            "Legal Counsel",
            "Business Development Manager",
        ]

        for title in disqualified_titles:
            res = RelevanceClassifier.classify(title=title)
            self.assertFalse(
                res.relevant,
                f"Expected relevant=False for non-technical role '{title}', got {res.relevant}",
            )

    def test_company_role_filter_matching(self):
        """Verify company-specific role filter whitelist."""
        role_filter = ["Summer Analyst", "Technology", "APAC"]

        # Matches all 3 filters across title/team/location
        p_match = ExtractedPosting(
            external_id="1",
            title="2026 Summer Analyst Program",
            team="Technology Division",
            location="Bengaluru, APAC",
            url="https://example.com/1",
        )
        res_match = classify_posting(p_match, role_filter=role_filter)
        self.assertTrue(res_match.relevant, f"Failed matching role filter: {res_match.rationale}")

        # Missing APAC location/team
        p_no_match = ExtractedPosting(
            external_id="2",
            title="2026 Summer Analyst Program",
            team="Technology Division",
            location="New York, US",
            url="https://example.com/2",
        )
        res_no_match = classify_posting(p_no_match, role_filter=role_filter)
        self.assertFalse(res_no_match.relevant)
        self.assertIn("Missing company role filter", res_no_match.rationale)


if __name__ == "__main__":
    unittest.main()
