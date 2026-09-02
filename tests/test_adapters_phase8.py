"""Unit tests for Phase 8 Enterprise ATS Adapters (Workday, Amazon, Google, Microsoft, Goldman Sachs, Eightfold)."""
import unittest
from unittest.mock import patch, MagicMock

from src.adapters.workday import WorkdayAdapter
from src.adapters.amazon import AmazonAdapter
from src.adapters.google import GoogleAdapter
from src.adapters.microsoft import MicrosoftAdapter
from src.adapters.goldman import GoldmanSachsAdapter
from src.adapters.eightfold import EightfoldAdapter
from src.adapters.registry import get_adapter


class TestPhase8Adapters(unittest.TestCase):
    """Test suite for Phase 8 reverse-engineered enterprise ATS adapters."""

    def test_workday_adapter_parsing(self):
        """Verify Workday CXS JSON parsing extracts external_id, title, team, location."""
        sample_workday_json = {
            "total": 2,
            "jobPostings": [
                {
                    "title": "Software Engineering Intern - Summer 2026",
                    "externalPath": "/job/R-12345",
                    "locationsText": "San Francisco, CA; Remote",
                    "bulletFields": ["Core Platform Engineering", "Full-time"],
                    "postedOn": "Posted 2 Days Ago",
                },
                {
                    "title": "Member of Technical Staff (MTS)",
                    "externalPath": "/job/R-98765",
                    "locationsText": "Bengaluru, India",
                    "bulletFields": ["Database Infrastructure"],
                    "postedOn": "Posted Today",
                },
            ],
        }

        adapter = WorkdayAdapter(
            company_name="Salesforce",
            careers_url="https://salesforce.wd12.myworkdayjobs.com/Careers",
            tenant="salesforce",
            client_site="Careers",
        )

        postings = adapter.parse_postings(sample_workday_json)
        self.assertEqual(len(postings), 2)

        self.assertEqual(postings[0].external_id, "R-12345")
        self.assertEqual(postings[0].title, "Software Engineering Intern - Summer 2026")
        self.assertEqual(postings[0].team, "Core Platform Engineering")
        self.assertIn("San Francisco", postings[0].location)
        self.assertIn("salesforce", postings[0].url)

        self.assertEqual(postings[1].external_id, "R-98765")
        self.assertEqual(postings[1].location, "Bengaluru, India")

    def test_amazon_adapter_parsing(self):
        """Verify Amazon Jobs search JSON parsing."""
        sample_amazon_json = {
            "hits": 1,
            "jobs": [
                {
                    "id": "246810",
                    "id_icims": "JOB-AMZN-99",
                    "title_search": "Software Development Engineer Internship 2026",
                    "city": "Bengaluru",
                    "country_code": "IND",
                    "business_category": "AWS Cloud Services",
                    "job_path": "/en/jobs/JOB-AMZN-99/software-development-engineer-internship-2026",
                }
            ],
        }

        adapter = AmazonAdapter(company_name="Amazon")
        postings = adapter.parse_postings(sample_amazon_json)

        self.assertEqual(len(postings), 1)
        self.assertEqual(postings[0].external_id, "JOB-AMZN-99")
        self.assertEqual(postings[0].title, "Software Development Engineer Internship 2026")
        self.assertEqual(postings[0].team, "AWS Cloud Services")
        self.assertEqual(postings[0].location, "Bengaluru, IND")
        self.assertIn("amazon.jobs/en/jobs/JOB-AMZN-99", postings[0].url)

    def test_google_adapter_parsing(self):
        """Verify Google Careers search JSON parsing."""
        sample_google_json = {
            "count": 1,
            "jobs": [
                {
                    "id": "google-swe-2026-1",
                    "title": "Software Engineer, University Graduate, 2026",
                    "categories": ["Software Engineering", "Infrastructure"],
                    "locations": [{"display": "Bengaluru, Karnataka, India"}],
                }
            ],
        }

        adapter = GoogleAdapter(company_name="Google")
        postings = adapter.parse_postings(sample_google_json)

        self.assertEqual(len(postings), 1)
        self.assertEqual(postings[0].external_id, "google-swe-2026-1")
        self.assertEqual(postings[0].title, "Software Engineer, University Graduate, 2026")
        self.assertEqual(postings[0].team, "Software Engineering")
        self.assertEqual(postings[0].location, "Bengaluru, Karnataka, India")
        self.assertIn("google-swe-2026-1", postings[0].url)

    def test_microsoft_adapter_parsing(self):
        """Verify Microsoft Careers search JSON parsing."""
        sample_microsoft_json = {
            "operationResult": {
                "result": {
                    "jobs": [
                        {
                            "jobId": "1789234",
                            "title": "Software Engineer Intern - Summer 2026",
                            "properties": {
                                "primaryLocation": "Hyderabad, Telangana, India",
                                "profession": "Software Engineering",
                            },
                        }
                    ]
                }
            }
        }

        adapter = MicrosoftAdapter(company_name="Microsoft")
        postings = adapter.parse_postings(sample_microsoft_json)

        self.assertEqual(len(postings), 1)
        self.assertEqual(postings[0].external_id, "1789234")
        self.assertEqual(postings[0].title, "Software Engineer Intern - Summer 2026")
        self.assertEqual(postings[0].location, "Hyderabad, Telangana, India")
        self.assertIn("1789234", postings[0].url)

    def test_goldman_sachs_adapter_parsing(self):
        """Verify Goldman Sachs Careers JSON parsing."""
        sample_gs_json = {
            "jobs": [
                {
                    "jobId": "GS-TECH-2026",
                    "title": "2026 Summer Analyst Program - Technology Division",
                    "division": "Engineering & Technology",
                    "location": "Bengaluru / Singapore",
                    "deadline": "2026-10-31",
                }
            ]
        }

        adapter = GoldmanSachsAdapter(company_name="Goldman Sachs")
        postings = adapter.parse_postings(sample_gs_json)

        self.assertEqual(len(postings), 1)
        self.assertEqual(postings[0].external_id, "GS-TECH-2026")
        self.assertEqual(postings[0].title, "2026 Summer Analyst Program - Technology Division")
        self.assertEqual(postings[0].team, "Engineering & Technology")
        self.assertEqual(postings[0].location, "Bengaluru / Singapore")
        self.assertIn("2026-10-31", str(postings[0].deadline))

    def test_eightfold_adapter_parsing(self):
        """Verify Eightfold AI search JSON parsing."""
        sample_eightfold_json = {
            "positions": [
                {
                    "id": 554433,
                    "name": "Engineer I - Java / Microservices",
                    "department": "Global Technology",
                    "locations": ["Gurugram, HR, India"],
                    "canonicalPositionUrl": "https://aexp.eightfold.ai/careers/job/554433",
                }
            ]
        }

        adapter = EightfoldAdapter(
            company_name="American Express",
            careers_url="https://aexp.eightfold.ai",
        )
        postings = adapter.parse_postings(sample_eightfold_json)

        self.assertEqual(len(postings), 1)
        self.assertEqual(postings[0].external_id, "554433")
        self.assertEqual(postings[0].title, "Engineer I - Java / Microservices")
        self.assertEqual(postings[0].team, "Global Technology")
        self.assertEqual(postings[0].location, "Gurugram, HR, India")
        self.assertIn("554433", postings[0].url)

    def test_registry_resolution_for_enterprise_companies(self):
        """Verify registry resolves adapters correctly by name and ats_type."""
        goldman_adapter = get_adapter("Goldman Sachs", "https://www.goldmansachs.com/careers/", "goldman")
        self.assertIsInstance(goldman_adapter, GoldmanSachsAdapter)

        workday_adapter = get_adapter("Salesforce", "https://salesforce.wd12.myworkdayjobs.com/Careers", "workday")
        self.assertIsInstance(workday_adapter, WorkdayAdapter)

        amazon_adapter = get_adapter("Amazon", "https://www.amazon.jobs", "amazon")
        self.assertIsInstance(amazon_adapter, AmazonAdapter)

        google_adapter = get_adapter("Google", "https://careers.google.com", "google")
        self.assertIsInstance(google_adapter, GoogleAdapter)

        microsoft_adapter = get_adapter("Microsoft", "https://careers.microsoft.com", "microsoft")
        self.assertIsInstance(microsoft_adapter, MicrosoftAdapter)

        eightfold_adapter = get_adapter("American Express", "https://aexp.eightfold.ai", "eightfold")
        self.assertIsInstance(eightfold_adapter, EightfoldAdapter)


if __name__ == "__main__":
    unittest.main()
