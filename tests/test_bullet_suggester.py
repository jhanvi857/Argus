"""Unit tests for read-only bullet suggestion engine."""
import unittest
from src.services.bullet_suggester import generate_bullet_suggestions


class TestBulletSuggester(unittest.TestCase):
    def setUp(self):
        self.resume_text = """
Software Engineer Intern
• Built scalable message queue consumer processing 20,000 events/sec with Redis and Kafka.
• Optimized PostgreSQL query performance, reducing p99 latency by 35%.
"""
        self.projects = [
            {
                "id": "nioflow",
                "name": "NioFlow",
                "quantified_bullets": [
                    "Engineered Raft consensus engine in Go achieving 50,000 ops/sec with zero log divergence.",
                    "Designed zero-allocation memory pool reducing GC pause times by 65% under peak workload."
                ]
            }
        ]

    def test_suggestions_use_ground_truth(self):
        missing = ["Go", "Kubernetes", "Redis"]
        suggestions = generate_bullet_suggestions(
            missing_keywords=missing,
            resume_text=self.resume_text,
            projects=self.projects,
        )

        self.assertGreater(len(suggestions), 0)
        for s in suggestions:
            self.assertIn("keyword", s)
            self.assertIn("original_bullet", s)
            self.assertIn("suggested_rewrite", s)
            self.assertIn("source_project", s)
            self.assertIsNotNone(s.get("confirmation_needed"))

    def test_empty_missing_keywords(self):
        suggestions = generate_bullet_suggestions([], self.resume_text, self.projects)
        self.assertEqual(len(suggestions), 0)


if __name__ == "__main__":
    unittest.main()

