"""
DRIFT — Azure Functions App
HTTP routes for the travel planner API.
"""

import azure.functions as func
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

logger = logging.getLogger(__name__)

# =============================================================================
# Helper: JSON response
# =============================================================================

def json_response(
    data: Any = None,
    status_code: int = 200,
    error: str | None = None,
    message: str | None = None,
) -> func.HttpResponse:
    """Create a JSON HTTP response."""
    body = {"success": error is None}
    if data is not None:
        body["data"] = data
    if error:
        body["error"] = error
    if message:
        body["message"] = message

    return func.HttpResponse(
        body=json.dumps(body, default=str),
        status_code=status_code,
        mimetype="application/json",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    )


# =============================================================================
# POST /api/plan — Generate itinerary with Planner Agent
# =============================================================================

@app.route(route="plan", methods=["POST", "OPTIONS"])
async def plan_trip(req: func.HttpRequest) -> func.HttpResponse:
    """Generate a trip itinerary using the Planner Agent."""
    if req.method == "OPTIONS":
        return json_response(message="OK")

    try:
        body = req.get_json()
    except ValueError:
        return json_response(error="Invalid JSON body", status_code=400)

    required_fields = ["destination", "startDate", "endDate", "travelers", "budget"]
    for field in required_fields:
        if field not in body:
            return json_response(error=f"Missing required field: {field}", status_code=400)

    try:
        # Import agent here to avoid cold start issues
        from agents.planner_agent import PlannerAgent

        agent = PlannerAgent()
        result = await agent.generate_itinerary(
            destination=body["destination"],
            start_date=body["startDate"],
            end_date=body["endDate"],
            travelers=body.get("travelers", 1),
            budget=body.get("budget", 100000),
            currency=body.get("currency", "INR"),
            theme=body.get("theme", "cultural"),
            activity_level=body.get("activityLevel", "moderate"),
            special_requests=body.get("specialRequests"),
        )

        # Create trip in database
        try:
            from db import get_db
            db = get_db()
            trip = db.create_trip(
                user_id=body.get("userId", "anonymous"),
                trip_input=body,
            )
            trip["itinerary"] = result
            db.update_trip(trip["id"], trip["userId"], {"itinerary": result, "status": "customizing"})
            result["tripId"] = trip["id"]
        except Exception as db_err:
            logger.warning(f"DB save failed (continuing): {db_err}")
            result["tripId"] = str(uuid.uuid4())

        return json_response(data=result)

    except Exception as e:
        logger.error(f"Plan trip error: {e}")
        return json_response(error=str(e), status_code=500)


# =============================================================================
# POST /api/retrieve — Fetch flights, hotels, experiences (SSE)
# =============================================================================

@app.route(route="retrieve", methods=["POST", "OPTIONS"])
async def retrieve_options(req: func.HttpRequest) -> func.HttpResponse:
    """
    Retrieve travel options using the Retriever Agent.
    Returns SSE stream with progress events.
    """
    if req.method == "OPTIONS":
        return json_response(message="OK")

    try:
        body = req.get_json()
    except ValueError:
        return json_response(error="Invalid JSON body", status_code=400)

    try:
        from agents.retriever_agent import RetrieverAgent

        agent = RetrieverAgent()
        results = await agent.retrieve_all(
            cities=body.get("cities", []),
            start_date=body.get("startDate", ""),
            end_date=body.get("endDate", ""),
            travelers=body.get("travelers", 1),
            budget=body.get("budget", 100000),
            currency=body.get("currency", "INR"),
        )

        return json_response(data=results)

    except Exception as e:
        logger.error(f"Retrieve error: {e}")
        return json_response(error=str(e), status_code=500)


# =============================================================================
# POST /api/retrieve/stream — SSE streaming endpoint
# =============================================================================

@app.route(route="retrieve/stream", methods=["POST", "OPTIONS"])
async def retrieve_stream(req: func.HttpRequest) -> func.HttpResponse:
    """
    Stream retrieval progress via SSE.
    Note: Azure Functions HTTP trigger doesn't natively support SSE.
    This returns a NDJSON response for compatibility.
    """
    if req.method == "OPTIONS":
        return json_response(message="OK")

    try:
        body = req.get_json()
    except ValueError:
        return json_response(error="Invalid JSON body", status_code=400)

    try:
        from agents.retriever_agent import RetrieverAgent

        agent = RetrieverAgent()
        events: list[dict] = []

        async for event in agent.retrieve_streaming(
            cities=body.get("cities", []),
            start_date=body.get("startDate", ""),
            end_date=body.get("endDate", ""),
            travelers=body.get("travelers", 1),
            budget=body.get("budget", 100000),
            currency=body.get("currency", "INR"),
        ):
            events.append(event)

        # Return all events as NDJSON
        ndjson = "\n".join(json.dumps(e, default=str) for e in events)

        return func.HttpResponse(
            body=ndjson,
            status_code=200,
            mimetype="application/x-ndjson",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache",
            },
        )

    except Exception as e:
        logger.error(f"Stream error: {e}")
        return json_response(error=str(e), status_code=500)


# =============================================================================
# POST /api/execute — Book trip with Executor Agent
# =============================================================================

@app.route(route="execute", methods=["POST", "OPTIONS"])
async def execute_booking(req: func.HttpRequest) -> func.HttpResponse:
    """Execute booking using the Executor Agent."""
    if req.method == "OPTIONS":
        return json_response(message="OK")

    try:
        body = req.get_json()
    except ValueError:
        return json_response(error="Invalid JSON body", status_code=400)

    required_fields = ["tripId", "flights", "hotels", "totalCost"]
    for field in required_fields:
        if field not in body:
            return json_response(error=f"Missing required field: {field}", status_code=400)

    try:
        from agents.executor_agent import ExecutorAgent

        agent = ExecutorAgent()
        result = await agent.execute_booking(
            trip_id=body["tripId"],
            user_id=body.get("userId", "anonymous"),
            flights=body.get("flights", []),
            hotels=body.get("hotels", []),
            experiences=body.get("experiences", []),
            total_cost=body["totalCost"],
            currency=body.get("currency", "INR"),
            payment_method=body.get("paymentMethod"),
        )

        return json_response(data=result)

    except Exception as e:
        logger.error(f"Execute error: {e}")
        return json_response(error=str(e), status_code=500)


# =============================================================================
# POST /api/execute/stream — SSE booking execution (Hackathon Demo)
# =============================================================================

@app.route(route="execute/stream", methods=["POST", "OPTIONS"])
async def execute_stream(req: func.HttpRequest) -> func.HttpResponse:
    """
    Stream booking execution progress via NDJSON.
    Each line is a JSON event with step, status, message, data.
    """
    if req.method == "OPTIONS":
        return json_response(message="OK")

    try:
        body = req.get_json()
    except ValueError:
        return json_response(error="Invalid JSON body", status_code=400)

    required_fields = ["tripId", "flights", "hotels", "totalCost"]
    for field in required_fields:
        if field not in body:
            return json_response(error=f"Missing required field: {field}", status_code=400)

    try:
        from agents.executor_agent import ExecutorAgent

        agent = ExecutorAgent()
        events: list[dict] = []

        async for event in agent.execute_streaming(
            trip_id=body["tripId"],
            user_id=body.get("userId", "anonymous"),
            flights=body.get("flights", {}),
            hotels=body.get("hotels", []),
            experiences=body.get("experiences", []),
            total_cost=body["totalCost"],
            currency=body.get("currency", "INR"),
        ):
            events.append(event)

        # Return all events as NDJSON
        ndjson = "\n".join(json.dumps(e, default=str) for e in events)

        return func.HttpResponse(
            body=ndjson,
            status_code=200,
            mimetype="application/x-ndjson",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Cache-Control": "no-cache",
            },
        )

    except Exception as e:
        logger.error(f"Execute stream error: {e}")
        return json_response(error=str(e), status_code=500)


# =============================================================================
# POST /api/chat — Chat with Planner Agent
# =============================================================================

@app.route(route="chat", methods=["POST", "OPTIONS"])
async def chat_with_planner(req: func.HttpRequest) -> func.HttpResponse:
    """Chat with the Planner Agent to modify itinerary."""
    if req.method == "OPTIONS":
        return json_response(message="OK")

    try:
        body = req.get_json()
    except ValueError:
        return json_response(error="Invalid JSON body", status_code=400)

    if "message" not in body or "itinerary" not in body:
        return json_response(
            error="Missing required fields: message, itinerary",
            status_code=400,
        )

    try:
        from agents.planner_agent import PlannerAgent

        agent = PlannerAgent()
        result = await agent.modify_itinerary(
            message=body["message"],
            current_itinerary=body["itinerary"],
            chat_history=body.get("chatHistory", []),
        )

        return json_response(data=result)

    except Exception as e:
        logger.error(f"Chat error: {e}")
        return json_response(error=str(e), status_code=500)


# =============================================================================
# GET /api/trip/{tripId} — Get trip details
# =============================================================================

@app.route(route="trip/{tripId}", methods=["GET", "OPTIONS"])
async def get_trip(req: func.HttpRequest) -> func.HttpResponse:
    """Get trip details by ID."""
    if req.method == "OPTIONS":
        return json_response(message="OK")

    trip_id = req.route_params.get("tripId")
    user_id = req.params.get("userId", "anonymous")

    try:
        from db import get_db
        db = get_db()
        trip = db.get_trip(trip_id, user_id)

        if not trip:
            return json_response(error="Trip not found", status_code=404)

        return json_response(data=trip)

    except Exception as e:
        logger.error(f"Get trip error: {e}")
        return json_response(error=str(e), status_code=500)


# =============================================================================
# GET /api/trips — Get all trips for a user
# =============================================================================

@app.route(route="trips", methods=["GET", "OPTIONS"])
async def get_trips(req: func.HttpRequest) -> func.HttpResponse:
    """Get all trips for a user."""
    if req.method == "OPTIONS":
        return json_response(message="OK")

    user_id = req.params.get("userId", "anonymous")

    try:
        from db import get_db
        db = get_db()
        trips = db.get_user_trips(user_id)
        return json_response(data=trips)

    except Exception as e:
        logger.error(f"Get trips error: {e}")
        return json_response(error=str(e), status_code=500)


# =============================================================================
# GET /api/health — Health check
# =============================================================================

@app.route(route="health", methods=["GET"])
async def health_check(req: func.HttpRequest) -> func.HttpResponse:
    """Health check endpoint."""
    return json_response(
        data={
            "status": "healthy",
            "service": "drift-api",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )
