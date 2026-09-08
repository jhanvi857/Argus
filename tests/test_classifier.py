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

    def test_role_level_filter_intern_only(self):
        """Verify role_level='intern' accepts internships and rejects new grad roles."""
        # Should accept intern roles
        res_intern = RelevanceClassifier.classify(
            title="Software Engineering Intern - Backend",
            team="Infrastructure",
            role_level="intern",
        )
        self.assertTrue(res_intern.relevant)
        self.assertIn("Intern", res_intern.rationale)

        # Should reject new grad roles
        res_new_grad = RelevanceClassifier.classify(
            title="New Grad Software Engineer (2026)",
            team="Backend Systems",
            role_level="intern",
        )
        self.assertFalse(res_new_grad.relevant)
        self.assertIn("user preference is Intern only", res_new_grad.rationale)

    def test_role_level_filter_new_grad_only(self):
        """Verify role_level='new_grad' accepts new grad roles and rejects internships."""
        # Should accept new grad roles
        res_new_grad = RelevanceClassifier.classify(
            title="New Grad Software Engineer (2026)",
            team="Backend Systems",
            role_level="new_grad",
        )
        self.assertTrue(res_new_grad.relevant)
        self.assertIn("New Grad", res_new_grad.rationale)

        # Should reject intern roles
        res_intern = RelevanceClassifier.classify(
            title="Software Engineering Intern - Backend",
            team="Infrastructure",
            role_level="new_grad",
        )
        self.assertFalse(res_intern.relevant)
        self.assertIn("user preference is New Grad only", res_intern.rationale)

    def test_target_locations_filtering(self):
        """Verify target_locations matches target countries and rejects non-matching ones."""
        target_locs = ["India", "United States", "Remote"]

        # In target: Bengaluru, India
        res_in_india = RelevanceClassifier.classify(
            title="Software Engineer Intern",
            team="Backend",
            location="Bengaluru, Karnataka, India",
            target_locations=target_locs,
        )
        self.assertTrue(res_in_india.relevant)

        # In target: San Francisco, USA (matched via city alias)
        res_in_us = RelevanceClassifier.classify(
            title="Software Engineer Intern",
            team="Platform",
            location="San Francisco, CA",
            target_locations=target_locs,
        )
        self.assertTrue(res_in_us.relevant)

        # In target: Remote
        res_remote = RelevanceClassifier.classify(
            title="Backend Engineer Intern - Remote",
            team="Core",
            location="Remote",
            target_locations=target_locs,
        )
        self.assertTrue(res_remote.relevant)

        # Out of target: London, United Kingdom
        res_uk = RelevanceClassifier.classify(
            title="Software Engineer Intern",
            team="Trading Systems",
            location="London, United Kingdom",
            target_locations=target_locs,
        )
        self.assertFalse(res_uk.relevant)
        self.assertIn("does not match target locations", res_uk.rationale)

        # Out of target: Tokyo, Japan
        res_japan = RelevanceClassifier.classify(
            title="Software Engineer Intern",
            team="Robotics",
            location="Tokyo, Japan",
            target_locations=target_locs,
        )
        self.assertFalse(res_japan.relevant)
        self.assertIn("does not match target locations", res_japan.rationale)


if __name__ == "__main__":
    unittest.main()

