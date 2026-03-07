"""
DRIFT — Azure AI Content Safety Wrapper
Validates agent outputs before returning to user.
"""

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class ContentSafety:
    """
    Wrapper for Azure AI Content Safety service.
    Checks text content for harmful, unsafe, or off-topic material.
    """

    def __init__(self) -> None:
        import os

        self.endpoint = os.environ.get("AZURE_CONTENT_SAFETY_ENDPOINT", "")
        self.api_key = os.environ.get("AZURE_CONTENT_SAFETY_KEY", "")
        self.enabled = bool(self.endpoint and self.api_key)

        if not self.enabled:
            logger.warning(
                "Content Safety not configured — safety checks will be skipped"
            )

    async def check_text(self, text: str) -> dict[str, Any]:
        """
        Check text content for safety violations.

        Args:
            text: The text content to check

        Returns:
            Dict with 'safe' boolean and optional 'reason' string
        """
        if not self.enabled:
            return {"safe": True, "reason": None}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{self.endpoint}/contentsafety/text:analyze?api-version=2023-10-01",
                    headers={
                        "Ocp-Apim-Subscription-Key": self.api_key,
                        "Content-Type": "application/json",
                    },
                    json={
                        "text": text[:5120],  # API limit
                        "categories": ["Hate", "SelfHarm", "Sexual", "Violence"],
                        "outputType": "FourSeverityLevels",
                    },
                )
                resp.raise_for_status()
                result = resp.json()

                # Check if any category exceeds threshold (severity >= 2)
                for category in result.get("categoriesAnalysis", []):
                    if category.get("severity", 0) >= 2:
                        return {
                            "safe": False,
                            "reason": f"Content flagged for {category['category']} "
                                      f"(severity: {category['severity']})",
                        }

                return {"safe": True, "reason": None}

        except Exception as e:
            logger.error(f"Content safety check error: {e}")
            # Fail open — allow content if safety service is down
            # In production, you might want to fail closed instead
            return {"safe": True, "reason": None, "error": str(e)}

    async def check_image(self, image_data: bytes) -> dict[str, Any]:
        """Check image content for safety. Placeholder for future use."""
        if not self.enabled:
            return {"safe": True, "reason": None}

        # Azure AI Content Safety supports image analysis
        # Implementation similar to text but with image:analyze endpoint
        return {"safe": True, "reason": None}
