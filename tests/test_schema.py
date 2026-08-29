"""Unit tests verifying Phase 1 schema definitions, constraints, and seed portfolio integrity."""
import json
import re
import unittest
from pathlib import Path
from src.db.models import Project, Company, Posting, Match, Application, Snapshot

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_FILE = PROJECT_ROOT / "db" / "schema.sql"
SEED_FILE = PROJECT_ROOT / "db" / "seed_projects.sql"

REQUIRED_PROJECT_IDS = [
    "nioflow",
    "evora",
    "gitresolve",
    "docstream",
    "cloudweave",
    "meridian",
    "arbiter",
    "vexor",
    "substrate",
    "aegis",
    "streamify",
]

REQUIRED_TABLES = [
    "companies",
    "snapshots",
    "postings",
    "projects",
    "matches",
    "applications",
]


class TestPhase1SchemaAndSeed(unittest.TestCase):
    """Test suite for validating schema DDL and seed project portfolio."""

    def test_schema_file_exists(self):
        """Verify that db/schema.sql exists and is not empty."""
        self.assertTrue(SCHEMA_FILE.exists(), "db/schema.sql must exist")
        content = SCHEMA_FILE.read_text(encoding="utf-8")
        self.assertGreater(len(content.strip()), 0, "db/schema.sql must not be empty")

    def test_seed_file_exists(self):
        """Verify that db/seed_projects.sql exists and is not empty."""
        self.assertTrue(SEED_FILE.exists(), "db/seed_projects.sql must exist")
        content = SEED_FILE.read_text(encoding="utf-8")
        self.assertGreater(len(content.strip()), 0, "db/seed_projects.sql must not be empty")

    def test_all_required_tables_in_schema(self):
        """Verify all 6 core tables are declared in schema.sql."""
        content = SCHEMA_FILE.read_text(encoding="utf-8").lower()
        for table in REQUIRED_TABLES:
            exists = f"create table if not exists {table}" in content or f"create table {table}" in content
            self.assertTrue(exists, f"Table '{table}' is missing from schema.sql")

    def test_schema_constraints_and_columns(self):
        """Verify essential constraints and columns are defined in schema.sql."""
        content = SCHEMA_FILE.read_text(encoding="utf-8")
        lower_content = content.lower()

        # postings constraints and fields
        self.assertTrue(
            "uq_company_external_id" in lower_content or "unique (company_id, external_id)" in lower_content,
            "Postings unique constraint missing",
        )
        self.assertIn("status varchar(50) default 'new'", lower_content)
        self.assertIn("relevant boolean", lower_content)
        self.assertIn("notified_at timestamptz", lower_content)

        # projects fields
        self.assertIn("id varchar(100) primary key", lower_content)
        self.assertIn("tech_stack text[]", lower_content)
        self.assertIn("tags text[]", lower_content)
        self.assertIn("quantified_bullets text[]", lower_content)
        self.assertIn("resume_variants jsonb", lower_content)

        # indexes
        self.assertIn("idx_projects_tags_gin", content)
        self.assertIn("idx_postings_status", content)
        self.assertIn("idx_snapshots_company_id", content)

    def test_all_11_projects_present_in_seed(self):
        """Verify all 11 required projects exist in seed_projects.sql."""
        content = SEED_FILE.read_text(encoding="utf-8")
        for proj_id in REQUIRED_PROJECT_IDS:
            pattern = rf"'\s*{proj_id}\s*'"
            match = re.search(pattern, content, re.IGNORECASE)
            self.assertIsNotNone(match, f"Project '{proj_id}' missing from seed_projects.sql")

    def test_seed_projects_data_structure(self):
        """Verify structure, tags, metrics, and JSON resume variants in seed_projects.sql."""
        content = SEED_FILE.read_text(encoding="utf-8")

        # Extract JSON blobs from seed file
        json_blocks = re.findall(r"('\{[\s\S]*?\}'::jsonb)", content)
        self.assertEqual(len(json_blocks), 11, f"Expected 11 JSON resume variant blocks, found {len(json_blocks)}")

        for raw_json in json_blocks:
            # Strip SQL wrapping ('...'::jsonb)
            cleaned_json = raw_json.strip()[1:-8].strip()
            parsed = json.loads(cleaned_json)
            self.assertIsInstance(parsed, dict)
            self.assertGreaterEqual(len(parsed), 1, "Resume variants dictionary must not be empty")
            for variant_key, bullets in parsed.items():
                self.assertIsInstance(bullets, list, f"Variant '{variant_key}' bullets must be a list")
                self.assertGreater(len(bullets), 0, f"Variant '{variant_key}' must have at least 1 bullet")

    def test_pydantic_project_model_validation(self):
        """Verify Pydantic models validate sample project correctly."""
        sample = {
            "id": "evora",
            "name": "Evora",
            "tech_stack": ["Go", "Raft", "gRPC"],
            "tags": ["distributed-systems", "storage", "consensus", "go"],
            "summary": "Distributed key-value store with Raft consensus and LSM-tree storage engine.",
            "quantified_bullets": [
                "45k write IOPS per node under continuous load.",
                "Sub-5ms p99 latency.",
            ],
            "resume_variants": {
                "distributed_systems": ["Implemented Raft consensus in Go."]
            },
        }
        proj = Project(**sample)
        self.assertEqual(proj.id, "evora")
        self.assertIn("consensus", proj.tags)
        self.assertEqual(len(proj.quantified_bullets), 2)
        self.assertIn("distributed_systems", proj.resume_variants)

    def test_pydantic_posting_model_validation(self):
        """Verify Posting model defaults and serialization."""
        sample = {
            "company_id": 1,
            "external_id": "REQ-10023",
            "title": "Software Engineering Intern - Infrastructure",
            "team": "Core Platform",
            "url": "https://careers.example.com/jobs/10023",
        }
        posting = Posting(**sample)
        self.assertEqual(posting.status, "new")
        self.assertIsNone(posting.relevant)
        self.assertIsNone(posting.notified_at)
        self.assertEqual(posting.external_id, "REQ-10023")


if __name__ == "__main__":
    unittest.main()
