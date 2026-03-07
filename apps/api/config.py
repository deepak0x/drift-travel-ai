"""
DRIFT — Configuration Loader
Loads configuration from environment variables or Azure Key Vault.
"""

import os
import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class Config:
    """Application configuration — loaded from env vars or Key Vault."""

    # Cosmos DB
    cosmos_endpoint: str
    cosmos_key: str
    cosmos_database: str

    # Azure OpenAI
    openai_api_key: str
    openai_api_base: str
    openai_deployment: str

    # Amadeus
    amadeus_api_key: str
    amadeus_api_secret: str

    # OpenTripMap
    opentripmap_api_key: str

    # Stripe
    stripe_secret_key: str

    # Azure Content Safety
    content_safety_endpoint: str
    content_safety_key: str

    # Key Vault (optional — used in production)
    key_vault_url: Optional[str] = None


def load_config() -> Config:
    """
    Load configuration from environment variables.
    In production, these are populated from Azure Key Vault references.
    """
    config = Config(
        cosmos_endpoint=os.environ.get("COSMOS_ENDPOINT", ""),
        cosmos_key=os.environ.get("COSMOS_KEY", ""),
        cosmos_database=os.environ.get("COSMOS_DATABASE", "drift-db"),
        openai_api_key=os.environ.get("OPENAI_API_KEY", ""),
        openai_api_base=os.environ.get("OPENAI_API_BASE", ""),
        openai_deployment=os.environ.get("OPENAI_DEPLOYMENT", "gpt-4o"),
        amadeus_api_key=os.environ.get("AMADEUS_API_KEY", ""),
        amadeus_api_secret=os.environ.get("AMADEUS_API_SECRET", ""),
        opentripmap_api_key=os.environ.get("OPENTRIPMAP_API_KEY", ""),
        stripe_secret_key=os.environ.get("STRIPE_SECRET_KEY", ""),
        content_safety_endpoint=os.environ.get("AZURE_CONTENT_SAFETY_ENDPOINT", ""),
        content_safety_key=os.environ.get("AZURE_CONTENT_SAFETY_KEY", ""),
        key_vault_url=os.environ.get("KEY_VAULT_URL"),
    )

    logger.info("Configuration loaded successfully")
    return config


# Singleton config instance
_config: Optional[Config] = None


def get_config() -> Config:
    """Get or create the singleton config instance."""
    global _config
    if _config is None:
        _config = load_config()
    return _config
