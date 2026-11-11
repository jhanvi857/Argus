"""Unit tests for ATS-Fit Scorer deterministic engine, synonym handling, and caching."""
import unittest
from unittest.mock import MagicMock
from src.services.ats_scorer import (
    DeterministicScorer,
    normalize_skill,
    match_skills,
    score_resume_against_jd,
    compute_hash,
    ATS_SCORE_DISCLAIMER
)


class TestATSScorer(unittest.TestCase):
    def setUp(self):
        self.sample_resume = """
John Doe
john.doe@example.com | (555) 123-4567 | github.com/johndoe | linkedin.com/in/johndoe

EDUCATION
Bachelor of Science in Computer Science, State University, 2021 - 2025

TECHNICAL SKILLS
Languages: Python, Go, TypeScript, C++, SQL
Technologies: Docker, K8s, PostgreSQL, Redis, AWS, Git

WORK EXPERIENCE
Software Engineer Intern - Acme Corp (May 2024 - Aug 2024)
• Scaled high-throughput message pipeline using Kafka, reducing message latency by 45%.
• Optimized PostgreSQL query execution plans, improving p99 read speeds across 10,000 requests/sec.
• Designed distributed caching layer with Redis, reducing DB queries by 60%.

PROJECTS
NioFlow - Distributed Task Engine
• Implemented Raft consensus in Go handling 50,000 RPCs/sec with zero log loss.
• Built CI/CD pipelines with GitHub Actions and deployed containerized pods on Kubernetes.
"""

    def test_parse_and_layout_evaluation(self):
        # Normal resume
        score, warnings = DeterministicScorer.evaluate_parse_and_layout(self.sample_resume)
        self.assertGreaterEqual(score, 8.0)
        self.assertEqual(len(warnings), 0)

        # Empty / scanned resume
        score_empty, warnings_empty = DeterministicScorer.evaluate_parse_and_layout("Short text")
        self.assertEqual(score_empty, 0.0)
        self.assertIn("Extremely low or missing text content", warnings_empty[0])

        # High pipe count table layout
        table_heavy = "Col 1 | Col 2 | Col 3 | " * 20
        _, warnings_table = DeterministicScorer.evaluate_parse_and_layout(table_heavy)
        self.assertTrue(any("pipes" in w for w in warnings_table))

    def test_sections_evaluation(self):
        score, found, missing = DeterministicScorer.evaluate_sections(self.sample_resume)
        self.assertEqual(score, 8.0)
        self.assertIn("Education", found)
        self.assertIn("Experience", found)
        self.assertIn("Projects", found)
        self.assertIn("Skills", found)
        self.assertEqual(len(missing), 0)

        # Incomplete resume
        incomplete = "John Doe\nI love coding in Python."
        _, found_inc, missing_inc = DeterministicScorer.evaluate_sections(incomplete)
        self.assertIn("Education", missing_inc)
        self.assertIn("Experience", missing_inc)

    def test_contact_info_evaluation(self):
        score, found, missing = DeterministicScorer.evaluate_contact_info(self.sample_resume)
        self.assertEqual(score, 4.0)
        self.assertIn("Email", found)
        self.assertIn("Phone", found)
        self.assertIn("Online Profile / Links", found)
        self.assertEqual(len(missing), 0)

        # Missing phone
        no_phone = "Contact: john@example.com, github.com/john"
        score_np, found_np, missing_np = DeterministicScorer.evaluate_contact_info(no_phone)
        self.assertIn("Phone", missing_np)
        self.assertIn("Email", found_np)

    def test_bullet_quantification(self):
        score, ratio, total, quant = DeterministicScorer.evaluate_bullet_quantification(self.sample_resume)
        self.assertGreater(total, 0)
        self.assertGreater(quant, 0)
        self.assertGreater(ratio, 0.5)
        self.assertGreaterEqual(score, 7.0)

    def test_synonym_matching_and_missing_skills(self):
        target_skills = ["Amazon Web Services", "PostgreSQL", "Rust", "Apache Spark"]
        matched, missing, synonyms = match_skills(target_skills, self.sample_resume)

        # PostgreSQL was matched
        self.assertIn("PostgreSQL", matched)

        # Amazon Web Services was matched via "AWS" synonym
        self.assertIn("Amazon Web Services", matched)
        self.assertEqual(synonyms.get("Amazon Web Services"), "aws")

        # Rust & Apache Spark are NOT in the resume and MUST be strictly in missing
        self.assertIn("Rust", missing)
        self.assertIn("Apache Spark", missing)
        self.assertNotIn("Rust", matched)
        self.assertNotIn("Apache Spark", matched)

    def test_score_resume_against_jd_with_cache(self):
        mock_db = MagicMock()
        mock_db.get_ats_score_by_hashes.return_value = None
        mock_db.save_ats_score.return_value = {"id": 1, "score": 85}

        jd = """
We are looking for a Software Engineer Intern with experience in Python, Go, Kubernetes, and PostgreSQL.
Preferred: Redis, Docker, Kafka, and Rust.
"""
        result = score_resume_against_jd(
            resume_text=self.sample_resume,
            jd_text=jd,
            resume_version_id=1,
            posting_id=10,
            db_manager=mock_db,
            force_refresh=False,
        )

        self.assertGreaterEqual(result["score"], 60)
        self.assertIn("breakdown", result)
        self.assertIn(ATS_SCORE_DISCLAIMER, result["disclaimer"])
        self.assertFalse(result["cached"])
        mock_db.save_ats_score.assert_called_once()

        # Test subsequent call returns from cache
        mock_db.get_ats_score_by_hashes.return_value = {
            "score": result["score"],
            "breakdown_json": result["breakdown"]
        }
        cached_result = score_resume_against_jd(
            resume_text=self.sample_resume,
            jd_text=jd,
            resume_version_id=1,
            posting_id=10,
            db_manager=mock_db,
            force_refresh=False,
        )
        self.assertTrue(cached_result["cached"])
        self.assertEqual(cached_result["score"], result["score"])


if __name__ == "__main__":
    unittest.main()
