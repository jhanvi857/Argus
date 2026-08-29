"""Configuration package for Argus."""
from .companies import (
    CompanyConfig,
    CompaniesCatalog,
    load_companies_config,
    DEFAULT_CONFIG_PATH,
)

__all__ = [
    "CompanyConfig",
    "CompaniesCatalog",
    "load_companies_config",
    "DEFAULT_CONFIG_PATH",
]
