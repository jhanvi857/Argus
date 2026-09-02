"""Target company configuration loader and validation models for Argus."""
from pathlib import Path
from typing import Dict, List, Optional, Union
import yaml
from pydantic import BaseModel, Field, field_validator

from src.db.models import Company

DEFAULT_CONFIG_PATH = Path(__file__).resolve().parent.parent.parent / "config" / "companies.yaml"


class CompanyConfig(BaseModel):
    """Configuration model for a single target company."""

    name: str
    careers_page_url: str
    ats_type: str = "verify"  # e.g., 'custom', 'greenhouse', 'lever', 'workday', 'verify'
    stipend: Optional[str] = None
    ats_url: Optional[str] = None
    role_filter: List[str] = Field(default_factory=list)
    category: Optional[str] = None
    oa_platform: Optional[str] = None
    hiring_process: Optional[str] = None

    @field_validator("name", "careers_page_url", "ats_type")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty")
        return v.strip()

    def to_db_company(self) -> Company:
        """Converts configuration entry to database Company model."""
        return Company(
            name=self.name,
            ats_type=self.ats_type,
            ats_url=self.ats_url,
            careers_page_url=self.careers_page_url,
        )


class CompaniesCatalog(BaseModel):
    """Catalog of target companies categorized by sector/type."""

    categories: Dict[str, List[CompanyConfig]] = Field(default_factory=dict)

    @classmethod
    def from_yaml(cls, path: Optional[Union[str, Path]] = None) -> "CompaniesCatalog":
        """Loads and parses companies from a YAML configuration file."""
        config_path = Path(path) if path else DEFAULT_CONFIG_PATH
        if not config_path.exists():
            raise FileNotFoundError(f"Companies config file not found at {config_path}")

        raw_content = config_path.read_text(encoding="utf-8")
        parsed_yaml = yaml.safe_load(raw_content)

        if not isinstance(parsed_yaml, dict):
            raise ValueError("Invalid YAML format: Root must be a dictionary of categories")

        catalog_dict: Dict[str, List[CompanyConfig]] = {}
        for category_name, company_list in parsed_yaml.items():
            if not isinstance(company_list, list):
                continue
            companies = []
            for item in company_list:
                if isinstance(item, dict):
                    # inject category into company item
                    company_data = {**item, "category": category_name}
                    companies.append(CompanyConfig(**company_data))
            catalog_dict[category_name] = companies

        return cls(categories=catalog_dict)

    def get_all_companies(self) -> List[CompanyConfig]:
        """Returns a flat list of all configured companies across all categories."""
        all_companies: List[CompanyConfig] = []
        for company_list in self.categories.values():
            all_companies.extend(company_list)
        return all_companies

    def get_companies_by_category(self, category: str) -> List[CompanyConfig]:
        """Returns companies belonging to a specific category."""
        return self.categories.get(category, [])

    def get_company_by_name(self, name: str) -> Optional[CompanyConfig]:
        """Finds a company by exact or case-insensitive name."""
        name_lower = name.strip().lower()
        for company in self.get_all_companies():
            if company.name.strip().lower() == name_lower:
                return company
        return None

    def get_companies_by_ats_type(self, ats_type: str) -> List[CompanyConfig]:
        """Returns companies filtered by ATS type (e.g. 'custom', 'verify', 'greenhouse')."""
        target_type = ats_type.strip().lower()
        return [c for c in self.get_all_companies() if c.ats_type.lower() == target_type]

    def list_categories(self) -> List[str]:
        """Returns list of category names in the catalog."""
        return list(self.categories.keys())

    @property
    def total_count(self) -> int:
        """Returns total number of companies in catalog."""
        return len(self.get_all_companies())


def load_companies_config(path: Optional[Union[str, Path]] = None) -> CompaniesCatalog:
    """Convenience function to load target companies catalog."""
    return CompaniesCatalog.from_yaml(path)
