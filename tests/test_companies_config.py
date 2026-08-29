"""Unit tests for Phase 2 companies.yaml configuration and loader."""
import unittest
from pathlib import Path
import yaml
from pydantic import ValidationError

from src.config.companies import (
    CompanyConfig,
    CompaniesCatalog,
    load_companies_config,
    DEFAULT_CONFIG_PATH,
)
from src.db.models import Company

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONFIG_FILE = PROJECT_ROOT / "config" / "companies.yaml"

EXPECTED_CATEGORIES = {
    "product_based": 19,
    "banking_and_quant": 20,
    "well_funded_startups": 11,
}
TOTAL_EXPECTED_COMPANIES = sum(EXPECTED_CATEGORIES.values())


class TestCompaniesConfig(unittest.TestCase):
    """Test suite for validating companies.yaml syntax, contents, and loader."""

    def test_companies_yaml_exists_and_non_empty(self):
        """Verify config/companies.yaml exists and is not empty."""
        self.assertTrue(CONFIG_FILE.exists(), "config/companies.yaml must exist")
        content = CONFIG_FILE.read_text(encoding="utf-8")
        self.assertGreater(len(content.strip()), 0, "companies.yaml must not be empty")

    def test_companies_yaml_structure(self):
        """Verify YAML parses into expected 3 categories."""
        content = CONFIG_FILE.read_text(encoding="utf-8")
        parsed = yaml.safe_load(content)
        self.assertIsInstance(parsed, dict, "companies.yaml root must be a mapping")

        for category in EXPECTED_CATEGORIES.keys():
            self.assertIn(category, parsed, f"Missing category '{category}' in companies.yaml")
            self.assertIsInstance(parsed[category], list, f"Category '{category}' must be a list")

    def test_category_counts(self):
        """Verify exact company count per category."""
        catalog = load_companies_config(CONFIG_FILE)
        self.assertEqual(catalog.total_count, TOTAL_EXPECTED_COMPANIES)

        for category, expected_count in EXPECTED_CATEGORIES.items():
            companies = catalog.get_companies_by_category(category)
            self.assertEqual(
                len(companies),
                expected_count,
                f"Category '{category}' expected {expected_count} companies, got {len(companies)}",
            )

    def test_company_entries_validity(self):
        """Verify each company entry has valid name, url, and ats_type."""
        catalog = load_companies_config(CONFIG_FILE)
        seen_names = set()

        for company in catalog.get_all_companies():
            # Name validation
            self.assertTrue(company.name.strip(), "Company name cannot be empty")
            self.assertNotIn(
                company.name.lower(),
                seen_names,
                f"Duplicate company name detected: '{company.name}'",
            )
            seen_names.add(company.name.lower())

            # URL validation
            self.assertTrue(
                company.careers_page_url.startswith("http://")
                or company.careers_page_url.startswith("https://"),
                f"Invalid careers URL for {company.name}: {company.careers_page_url}",
            )

            # ATS type validation
            self.assertTrue(company.ats_type.strip(), f"ATS type empty for {company.name}")

            # Category injection
            self.assertIn(company.category, EXPECTED_CATEGORIES.keys())

    def test_lookup_by_name(self):
        """Verify lookup by exact and case-insensitive names."""
        catalog = load_companies_config(CONFIG_FILE)

        # Exact match
        google = catalog.get_company_by_name("Google")
        self.assertIsNotNone(google)
        self.assertEqual(google.name, "Google")
        self.assertEqual(google.category, "product_based")
        self.assertEqual(google.ats_type, "custom")

        # Case-insensitive match
        citadel = catalog.get_company_by_name("citadel securities")
        self.assertIsNotNone(citadel)
        self.assertEqual(citadel.name, "Citadel Securities")
        self.assertEqual(citadel.category, "banking_and_quant")

        # Non-existent
        non_existent = catalog.get_company_by_name("NonExistentCorpXYZ")
        self.assertIsNone(non_existent)

    def test_filter_by_ats_type(self):
        """Verify filtering companies by ATS type."""
        catalog = load_companies_config(CONFIG_FILE)

        custom_ats_companies = catalog.get_companies_by_ats_type("custom")
        custom_names = [c.name for c in custom_ats_companies]

        self.assertIn("Google", custom_names)
        self.assertIn("Microsoft", custom_names)
        self.assertIn("Amazon", custom_names)
        self.assertIn("Goldman Sachs", custom_names)
        self.assertIn("JPMorgan Chase", custom_names)

    def test_model_conversion_to_db_company(self):
        """Verify conversion from CompanyConfig to database Company model."""
        sample_config = CompanyConfig(
            name="Stripe",
            careers_page_url="https://stripe.com/jobs",
            ats_type="greenhouse",
            ats_url="https://boards-api.greenhouse.io/v1/boards/stripe/jobs",
            category="well_funded_startups",
            stipend="strong",
        )
        db_model = sample_config.to_db_company()
        self.assertIsInstance(db_model, Company)
        self.assertEqual(db_model.name, "Stripe")
        self.assertEqual(db_model.ats_type, "greenhouse")
        self.assertEqual(db_model.ats_url, "https://boards-api.greenhouse.io/v1/boards/stripe/jobs")
        self.assertEqual(db_model.careers_page_url, "https://stripe.com/jobs")

    def test_config_loader_file_not_found(self):
        """Verify FileNotFoundError when config file path is invalid."""
        invalid_path = PROJECT_ROOT / "non_existent_config.yaml"
        with self.assertRaises(FileNotFoundError):
            load_companies_config(invalid_path)

    def test_company_config_validation_error(self):
        """Verify validation errors for empty/invalid fields."""
        with self.assertRaises(ValidationError):
            CompanyConfig(name="", careers_page_url="https://example.com", ats_type="verify")

        with self.assertRaises(ValidationError):
            CompanyConfig(name="Example", careers_page_url="", ats_type="verify")


if __name__ == "__main__":
    unittest.main()
