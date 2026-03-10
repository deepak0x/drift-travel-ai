"""
DRIFT — Planner Agent
Generates structured travel itineraries using GitHub Models (GPT-4o).
Compatible with any OpenAI-spec endpoint (Azure, GitHub, OpenAI direct).
Supports initial generation and chat-based modifications.
"""

import json
import logging
import uuid
from typing import Any, Optional

from openai import AsyncOpenAI

from agents.prompts import PLANNER_SYSTEM_PROMPT, PLANNER_MODIFICATION_PROMPT
from agents.content_safety import ContentSafety

logger = logging.getLogger(__name__)


class PlannerAgent:
    """AI agent that creates and modifies travel itineraries."""

    def __init__(self) -> None:
        import os

        # GitHub Models is OpenAI-API-compatible — just point base_url to their endpoint.
        # Falls back to official OpenAI if OPENAI_API_BASE is not set.
        api_key = os.environ.get("OPENAI_API_KEY", "")
        base_url = os.environ.get(
            "OPENAI_API_BASE", "https://models.github.ai/inference"
        )

        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
        )
        # GitHub Models uses "gpt-4o" model name directly (no deployment prefix needed)
        self.deployment = os.environ.get("OPENAI_DEPLOYMENT", "openai/gpt-4o")
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
            )

            content = response.choices[0].message.content or ""
            itinerary = self._parse_json(content)

            # Add metadata
            itinerary["id"] = str(uuid.uuid4())
            itinerary["tripId"] = ""  # Set by caller

            # Content safety check
            safety_result = await self.safety.check_text(content)
            if not safety_result["safe"]:
                logger.warning(f"Content safety flag: {safety_result['reason']}")
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
        Chat with the planner agent. Returns a conversational reply + targeted actions.

        Returns:
            {
                "response": "Friendly reply text...",
                "actions": [...],   # list of targeted updates
                "modified": True/False,
                "itinerary": current_itinerary  # unchanged — frontend applies actions
            }
        """
        history_text = ""
        if chat_history:
            # Keep last 6 messages to stay within token budget
            recent = chat_history[-6:]
            history_text = "\n".join(
                f"{msg['role'].upper()}: {msg['content']}" for msg in recent
            )

        # Build a compact itinerary summary (not the full JSON — too large)
        itinerary_summary = self._summarize_itinerary(current_itinerary)

        system_prompt = PLANNER_MODIFICATION_PROMPT.format(
            current_itinerary=itinerary_summary,
            chat_history=history_text or "No previous messages.",
        )

        # Safety check on user input
        input_safety = await self.safety.check_text(message)
        if not input_safety["safe"]:
            return {
                "itinerary": current_itinerary,
                "response": "I'm sorry, I can't process that request. Please rephrase it.",
                "actions": [],
                "modified": False,
            }

        try:
            response = await self.client.chat.completions.create(
                model=self.deployment,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message},
                ],
                temperature=0.8,
                max_tokens=1500,  # Much smaller — we only need reply + actions
            )

            content = response.choices[0].message.content or ""
            logger.info(f"Chat response raw: {content[:200]}")

            result = self._parse_json(content)
            reply = result.get("reply", "Got it! Let me help you with that.")
            actions = result.get("actions", [])

            return {
                "response": reply,
                "actions": actions,
                "itinerary": current_itinerary,  # frontend applies actions from state
                "modified": len(actions) > 0,
            }

        except json.JSONDecodeError as e:
            logger.error(f"Chat JSON parse error: {e}, content: {content[:300]}")
            # Fallback: return content as plain reply
            reply = content.strip() if content.strip() else "I'm here to help! What would you like to change about your trip?"
            return {
                "response": reply,
                "actions": [],
                "itinerary": current_itinerary,
                "modified": False,
            }
        except Exception as e:
            logger.error(f"Chat error: {e}")
            return {
                "itinerary": current_itinerary,
                "response": "Sorry, I had trouble processing that. Try asking me something like: 'Add a beach sunset on day 2' or 'What's the best area to stay in Goa?'",
                "actions": [],
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

    @staticmethod
    def _parse_json(content: str) -> dict:
        """Robustly parse JSON from LLM output.

        Handles all of these patterns GitHub Models may return:
          1. Raw JSON: {"key": ...}
          2. Markdown fenced: ```json\n{...}\n```
          3. Text before JSON: "Here is your itinerary:\n```json\n{...}\n```"
          4. Text before bare JSON: "Sure! Here:\n{...}"
        """
        text = content.strip()

        # Fast path: already valid JSON
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Strip markdown code fences (```json ... ``` or ``` ... ```)
        import re
        fence_match = re.search(r"```(?:json)?\s*\n([\s\S]*?)\n```", text)
        if fence_match:
            try:
                return json.loads(fence_match.group(1).strip())
            except json.JSONDecodeError:
                pass

        # Last resort: find the outermost { ... } block
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                pass

        raise json.JSONDecodeError("No valid JSON found in LLM response", text, 0)

    @staticmethod
    def _summarize_itinerary(itinerary: dict) -> str:
        """Build a compact text summary of the itinerary for the chat system prompt."""
        if not itinerary:
            return "No itinerary yet."
        lines = [f"Trip summary: {itinerary.get('summary', 'N/A')}"]
        for city in itinerary.get("cities", []):
            lines.append(f"\n{city.get('cityName')} ({city.get('arrivalDate')} → {city.get('departureDate')}):")
            for day in city.get("days", []):
                acts = ", ".join(a.get("name", "") for a in day.get("activities", []))
                lines.append(f"  Day {day.get('dayNumber')}: {day.get('title')} — {acts}")
        budget = itinerary.get("estimatedBudget", {})
        if budget:
            lines.append(f"\nEstimated budget: ₹{budget.get('total', 0):,}")
        return "\n".join(lines)
