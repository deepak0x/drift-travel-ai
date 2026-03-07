"""
DRIFT — Planner Agent
Generates structured travel itineraries using Azure OpenAI GPT-4o.
Supports initial generation and chat-based modifications.
"""

import json
import logging
import uuid
from typing import Any, Optional

from openai import AsyncAzureOpenAI

from agents.prompts import PLANNER_SYSTEM_PROMPT, PLANNER_MODIFICATION_PROMPT
from agents.content_safety import ContentSafety

logger = logging.getLogger(__name__)


class PlannerAgent:
    """AI agent that creates and modifies travel itineraries."""

    def __init__(self) -> None:
        import os

        self.client = AsyncAzureOpenAI(
            api_key=os.environ.get("OPENAI_API_KEY", ""),
            api_version="2024-06-01",
            azure_endpoint=os.environ.get("OPENAI_API_BASE", ""),
        )
        self.deployment = os.environ.get("OPENAI_DEPLOYMENT", "gpt-4o")
        self.safety = ContentSafety()

    async def generate_itinerary(
        self,
        destination: str,
        start_date: str,
        end_date: str,
        travelers: int = 1,
        budget: float = 100000,
        currency: str = "INR",
        theme: str = "cultural",
        activity_level: str = "moderate",
        special_requests: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Generate a complete trip itinerary based on user preferences.

        Args:
            destination: Target destination (city/country)
            start_date: Trip start date (YYYY-MM-DD)
            end_date: Trip end date (YYYY-MM-DD)
            travelers: Number of travelers
            budget: Total budget
            currency: Budget currency
            theme: Trip theme (adventure, cultural, relaxation, etc.)
            activity_level: How packed the schedule should be
            special_requests: Any special requirements

        Returns:
            Structured itinerary JSON
        """
        user_prompt = self._build_user_prompt(
            destination=destination,
            start_date=start_date,
            end_date=end_date,
            travelers=travelers,
            budget=budget,
            currency=currency,
            theme=theme,
            activity_level=activity_level,
            special_requests=special_requests,
        )

        logger.info(f"Generating itinerary for {destination} ({start_date} to {end_date})")

        try:
            response = await self.client.chat.completions.create(
                model=self.deployment,
                messages=[
                    {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=4096,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            itinerary = json.loads(content)

            # Add metadata
            itinerary["id"] = str(uuid.uuid4())
            itinerary["tripId"] = ""  # Set by caller

            # Content safety check
            safety_result = await self.safety.check_text(content)
            if not safety_result["safe"]:
                logger.warning(f"Content safety flag: {safety_result['reason']}")
                # Still return but add warning
                itinerary["_safetyWarning"] = safety_result["reason"]

            logger.info(f"Itinerary generated: {itinerary.get('summary', 'N/A')}")
            return itinerary

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse GPT response as JSON: {e}")
            raise ValueError("AI returned invalid itinerary format. Please try again.")
        except Exception as e:
            logger.error(f"Planner agent error: {e}")
            raise

    async def modify_itinerary(
        self,
        message: str,
        current_itinerary: dict[str, Any],
        chat_history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        """
        Modify an existing itinerary based on natural language chat.

        Args:
            message: User's modification request
            current_itinerary: Current itinerary JSON
            chat_history: Previous chat messages

        Returns:
            Modified itinerary JSON with a chat response
        """
        history_text = ""
        if chat_history:
            history_text = "\n".join(
                f"{msg['role'].upper()}: {msg['content']}" for msg in chat_history
            )

        system_prompt = PLANNER_MODIFICATION_PROMPT.format(
            current_itinerary=json.dumps(current_itinerary, indent=2),
            chat_history=history_text or "No previous messages.",
        )

        # Safety check on user input
        input_safety = await self.safety.check_text(message)
        if not input_safety["safe"]:
            return {
                "itinerary": current_itinerary,
                "response": "I'm sorry, I can't process that request. Please rephrase.",
                "modified": False,
            }

        try:
            response = await self.client.chat.completions.create(
                model=self.deployment,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message},
                ],
                temperature=0.7,
                max_tokens=4096,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            result = json.loads(content)

            return {
                "itinerary": result,
                "response": result.pop("_chatResponse", "Itinerary updated!"),
                "modified": True,
            }

        except Exception as e:
            logger.error(f"Modification error: {e}")
            return {
                "itinerary": current_itinerary,
                "response": f"Sorry, I couldn't apply that change: {str(e)}",
                "modified": False,
            }

    def _build_user_prompt(
        self,
        destination: str,
        start_date: str,
        end_date: str,
        travelers: int,
        budget: float,
        currency: str,
        theme: str,
        activity_level: str,
        special_requests: Optional[str],
    ) -> str:
        """Build the user prompt for itinerary generation."""
        prompt = f"""Plan a trip with these details:

- **Destination**: {destination}
- **Dates**: {start_date} to {end_date}
- **Travelers**: {travelers}
- **Total Budget**: {budget:,.0f} {currency}
- **Trip Theme**: {theme}
- **Activity Level**: {activity_level}
"""
        if special_requests:
            prompt += f"- **Special Requests**: {special_requests}\n"

        prompt += """
Please create a detailed day-by-day itinerary with realistic activities, 
estimated costs, and proper timing. Consider travel between cities if 
the destination spans multiple cities. Respond ONLY with the JSON object."""

        return prompt
