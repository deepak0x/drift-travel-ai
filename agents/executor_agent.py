"""
DRIFT — Executor Agent (Hackathon MVP)
Handles booking confirmation with realistic mock data and SSE streaming.

5-step execution flow:
  1. Flight Booking (mock confirmation codes, PNR, seat assignments)
  2. Hotel Reservation (mock reservation IDs, room details)
  3. Payment Processing (Stripe-style payment intent IDs)
  4. Document Generation (PDF content + QR codes)
  5. Save to Database (Cosmos DB write + trip status update)

Each step streams real-time progress events to the frontend.
"""

import asyncio
import json
import logging
import random
import string
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Optional

logger = logging.getLogger(__name__)


# =============================================================================
# SSE Event Types
# =============================================================================

class ExecutionStep:
    """Represents a single step in the booking execution pipeline."""

    FLIGHT_BOOKING = 1
    HOTEL_BOOKING = 2
    PAYMENT = 3
    DOCUMENTS = 4
    DATABASE = 5

    LABELS = {
        1: "Flight Booking",
        2: "Hotel Reservation",
        3: "Payment Processing",
        4: "Document Generation",
        5: "Saving Booking",
    }

    ICONS = {
        1: "✈️",
        2: "🏨",
        3: "💳",
        4: "📄",
        5: "💾",
    }


def _random_alpha(length: int = 6) -> str:
    """Generate random alphanumeric string (uppercase)."""
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def _random_hex(length: int = 24) -> str:
    """Generate random hex string (looks like real API IDs)."""
    return "".join(random.choices(string.hexdigits[:16], k=length))


def _sse_event(
    step: int,
    status: str,
    message: str,
    data: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Create a structured SSE event."""
    return {
        "step": step,
        "stepLabel": ExecutionStep.LABELS.get(step, ""),
        "stepIcon": ExecutionStep.ICONS.get(step, ""),
        "status": status,  # "processing" | "done" | "error"
        "message": message,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# =============================================================================
# Executor Agent
# =============================================================================

class ExecutorAgent:
    """
    Executes the complete booking flow with realistic mock confirmations.
    Streams progress via SSE events for the frontend execution screen.
    """

    def __init__(self) -> None:
        import os
        self.stripe_key = os.environ.get("STRIPE_SECRET_KEY", "")

    # =========================================================================
    # Main Streaming Entry Point
    # =========================================================================

    async def execute_streaming(
        self,
        trip_id: str,
        user_id: str,
        flights: dict[str, Any],
        hotels: list[dict[str, Any]],
        experiences: list[dict[str, Any]],
        total_cost: float,
        currency: str = "INR",
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Execute the full booking pipeline, yielding SSE events at each step.

        Yields:
            SSE events with step number, status, message, and data.
        """
        booking_id = str(uuid.uuid4())
        booking_ref = f"DRIFT-{_random_alpha(8)}"

        logger.info(f"Starting execution for trip {trip_id} | Ref: {booking_ref}")

        all_confirmations: dict[str, Any] = {
            "bookingId": booking_id,
            "bookingRef": booking_ref,
            "tripId": trip_id,
            "userId": user_id,
        }

        # ── Step 1: Content Safety Pre-check ─────────────────────────────
        try:
            from agents.content_safety import ContentSafety
            safety = ContentSafety()
            check_text = json.dumps({"flights": flights, "hotels": hotels, "cost": total_cost})
            safety_result = await safety.check_text(check_text)
            if not safety_result["safe"]:
                yield _sse_event(
                    0, "error",
                    f"Booking blocked by safety check: {safety_result['reason']}",
                )
                return
        except Exception as e:
            logger.warning(f"Safety check skipped: {e}")

        # ── Step 1: Flight Booking ───────────────────────────────────────
        yield _sse_event(
            ExecutionStep.FLIGHT_BOOKING, "processing",
            "Contacting airline reservation systems...",
        )
        await asyncio.sleep(1.2)

        yield _sse_event(
            ExecutionStep.FLIGHT_BOOKING, "processing",
            "Confirming seat availability and fare lock...",
        )
        await asyncio.sleep(1.3)

        flight_confirmations = self._mock_flight_booking(flights)
        all_confirmations["flights"] = flight_confirmations

        yield _sse_event(
            ExecutionStep.FLIGHT_BOOKING, "done",
            f"✅ {len(flight_confirmations)} flight(s) confirmed!",
            {"confirmations": flight_confirmations},
        )

        # ── Step 2: Hotel Booking ────────────────────────────────────────
        hotel_confirmations: list[dict[str, Any]] = []

        for i, hotel in enumerate(hotels):
            hotel_name = hotel.get("name", hotel.get("hotel", {}).get("name", f"Hotel {i+1}"))
            city = hotel.get("city", "")

            yield _sse_event(
                ExecutionStep.HOTEL_BOOKING, "processing",
                f"Reserving {hotel_name} in {city}..." if city else f"Reserving {hotel_name}...",
            )
            await asyncio.sleep(1.5 + random.random())

            confirmation = self._mock_hotel_booking(hotel, i)
            hotel_confirmations.append(confirmation)

            yield _sse_event(
                ExecutionStep.HOTEL_BOOKING, "processing",
                f"Room assigned at {hotel_name} ✓",
            )
            await asyncio.sleep(0.5)

        all_confirmations["hotels"] = hotel_confirmations

        yield _sse_event(
            ExecutionStep.HOTEL_BOOKING, "done",
            f"✅ {len(hotel_confirmations)} hotel(s) reserved!",
            {"confirmations": hotel_confirmations},
        )

        # ── Step 3: Payment Processing ───────────────────────────────────
        yield _sse_event(
            ExecutionStep.PAYMENT, "processing",
            "Initializing secure payment gateway...",
        )
        await asyncio.sleep(1.0)

        yield _sse_event(
            ExecutionStep.PAYMENT, "processing",
            f"Processing ₹{total_cost:,.0f} via Stripe...",
        )
        await asyncio.sleep(1.5)

        yield _sse_event(
            ExecutionStep.PAYMENT, "processing",
            "Verifying transaction with bank...",
        )
        await asyncio.sleep(1.0)

        payment_result = self._mock_payment(total_cost, currency, booking_ref)
        all_confirmations["payment"] = payment_result

        yield _sse_event(
            ExecutionStep.PAYMENT, "done",
            f"✅ Payment of ₹{total_cost:,.0f} successful!",
            {"payment": payment_result},
        )

        # ── Step 4: Document Generation ──────────────────────────────────
        yield _sse_event(
            ExecutionStep.DOCUMENTS, "processing",
            "Generating your trip itinerary PDF...",
        )
        await asyncio.sleep(1.2)

        yield _sse_event(
            ExecutionStep.DOCUMENTS, "processing",
            "Creating QR codes for check-in...",
        )
        await asyncio.sleep(1.0)

        documents = self._mock_documents(booking_ref, flight_confirmations, hotel_confirmations)
        all_confirmations["documents"] = documents

        yield _sse_event(
            ExecutionStep.DOCUMENTS, "done",
            "✅ Trip documents and QR codes generated!",
            {"documents": documents},
        )

        # ── Step 5: Save to Database ─────────────────────────────────────
        yield _sse_event(
            ExecutionStep.DATABASE, "processing",
            "Saving booking to your account...",
        )
        await asyncio.sleep(0.8)

        # Attempt real DB save (graceful fallback)
        db_result = await self._save_to_database(
            booking_id=booking_id,
            booking_ref=booking_ref,
            trip_id=trip_id,
            user_id=user_id,
            flights=flight_confirmations,
            hotels=hotel_confirmations,
            experiences=experiences,
            payment=payment_result,
            total_cost=total_cost,
            currency=currency,
        )
        all_confirmations["dbStatus"] = db_result

        yield _sse_event(
            ExecutionStep.DATABASE, "done",
            f"✅ Trip booked! Ref: {booking_ref}",
            {"booking": all_confirmations},
        )

    # =========================================================================
    # Non-streaming entry point (backward compat)
    # =========================================================================

    async def execute_booking(
        self,
        trip_id: str,
        user_id: str,
        flights: Any,
        hotels: list[dict[str, Any]],
        experiences: list[dict[str, Any]],
        total_cost: float,
        currency: str = "INR",
        payment_method: Optional[str] = None,
    ) -> dict[str, Any]:
        """Non-streaming booking — collects all results at once."""
        events: list[dict[str, Any]] = []
        async for event in self.execute_streaming(
            trip_id=trip_id,
            user_id=user_id,
            flights=flights if isinstance(flights, dict) else {"items": flights},
            hotels=hotels,
            experiences=experiences,
            total_cost=total_cost,
            currency=currency,
        ):
            events.append(event)

        # Find the final booking event
        final = next(
            (e for e in reversed(events) if e.get("step") == 5 and e.get("status") == "done"),
            None,
        )

        if final and final.get("data", {}).get("booking"):
            return {"success": True, "booking": final["data"]["booking"], "message": "Booking confirmed!"}

        return {"success": False, "error": "Booking execution failed", "events": events}

    # =========================================================================
    # Step 1: Mock Flight Booking
    # =========================================================================

    def _mock_flight_booking(self, flights: dict[str, Any]) -> list[dict[str, Any]]:
        """Generate realistic flight booking confirmations."""
        confirmations: list[dict[str, Any]] = []

        # Handle both formats: {departure, return} or {items: [...]}
        flight_list: list[dict[str, Any]] = []
        if "departure" in flights:
            flight_list.append(flights["departure"])
        if "return" in flights:
            flight_list.append(flights["return"])
        if "items" in flights:
            flight_list = flights["items"]
        if not flight_list and isinstance(flights, list):
            flight_list = flights

        airlines_codes = {
            "Air India": "AI", "IndiGo": "6E", "Vistara": "UK",
            "SpiceJet": "SG", "Akasa Air": "QP", "GoFirst": "G8",
        }

        seat_rows = list(range(1, 35))
        seat_cols = ["A", "B", "C", "D", "E", "F"]

        for flight in flight_list:
            airline = flight.get("airline", "Air India")
            code = airlines_codes.get(airline, "AI")
            flight_num = flight.get("flightNumber", f"{code}{random.randint(100, 999)}")

            dep = flight.get("departure", {})
            arr = flight.get("arrival", {})

            seat = f"{random.choice(seat_rows)}{random.choice(seat_cols)}"

            confirmations.append({
                "confirmationCode": f"{code}{_random_alpha(6)}",
                "pnr": _random_alpha(6),
                "status": "CONFIRMED",
                "ticket": {
                    "airline": airline,
                    "airlineCode": code,
                    "flightNumber": flight_num,
                    "departure": {
                        "airport": dep.get("airport", dep.get("iataCode", "DEL")),
                        "iataCode": dep.get("iataCode", "DEL"),
                        "dateTime": dep.get("dateTime", ""),
                        "terminal": dep.get("terminal", f"T{random.randint(1, 3)}"),
                        "gate": f"{random.choice(['A', 'B', 'C', 'D'])}{random.randint(1, 30)}",
                    },
                    "arrival": {
                        "airport": arr.get("airport", arr.get("iataCode", "BKK")),
                        "iataCode": arr.get("iataCode", "BKK"),
                        "dateTime": arr.get("dateTime", ""),
                        "terminal": arr.get("terminal", f"T{random.randint(1, 3)}"),
                    },
                    "seat": seat,
                    "class": flight.get("cabinClass", "Economy"),
                    "baggage": "15kg Cabin + 23kg Check-in",
                    "meal": "Included" if random.random() > 0.3 else "Pre-order available",
                },
                "boardingPassUrl": f"https://drift.travel/boarding/{_random_hex(12)}",
                "price": flight.get("price", 0),
            })

        return confirmations

    # =========================================================================
    # Step 2: Mock Hotel Booking
    # =========================================================================

    def _mock_hotel_booking(self, hotel: dict[str, Any], index: int) -> dict[str, Any]:
        """Generate realistic hotel booking confirmation."""
        hotel_info = hotel.get("hotel", hotel)
        hotel_name = hotel_info.get("name", f"Hotel {index + 1}")
        nights = hotel.get("nights", 3)

        room_types = [
            "Deluxe King Room", "Premium Twin Room", "Superior Double",
            "Executive Suite", "Deluxe Room with City View", "Club Room",
        ]
        floor = random.randint(3, 25)

        return {
            "reservationId": f"HTL-{_random_alpha(4)}-{uuid.uuid4().hex[:8].upper()}",
            "status": "CONFIRMED",
            "hotel": {
                "name": hotel_name,
                "address": hotel_info.get("address", "City Center"),
                "city": hotel.get("city", hotel_info.get("city", "")),
                "stars": hotel_info.get("stars", 4),
                "phone": f"+91-{random.randint(70, 99)}{random.randint(10000000, 99999999)}",
            },
            "room": {
                "type": hotel_info.get("roomType", random.choice(room_types)),
                "floor": floor,
                "roomNumber": f"{floor}{random.randint(1, 20):02d}",
                "bedType": "King" if "king" in hotel_info.get("roomType", "").lower() else "Double",
                "view": random.choice(["City View", "Garden View", "Pool View", "Mountain View"]),
                "amenities": ["WiFi", "Mini Bar", "Room Service", "Safe", "AC"],
            },
            "checkIn": hotel.get("checkIn", hotel_info.get("checkIn", "")),
            "checkOut": hotel.get("checkOut", hotel_info.get("checkOut", "")),
            "nights": nights,
            "guests": 2,
            "pricePerNight": hotel_info.get("pricePerNight", 0),
            "totalPrice": hotel_info.get("totalPrice", hotel_info.get("pricePerNight", 0) * nights),
            "confirmationEmail": "sent",
            "cancellationPolicy": "Free cancellation until 24h before check-in",
            "specialRequests": "Early check-in requested",
        }

    # =========================================================================
    # Step 3: Mock Payment Processing
    # =========================================================================

    def _mock_payment(
        self, amount: float, currency: str, booking_ref: str
    ) -> dict[str, Any]:
        """Generate realistic Stripe-style payment confirmation."""
        payment_id = f"pi_{_random_hex(24)}"
        charge_id = f"ch_{_random_hex(24)}"

        return {
            "paymentId": payment_id,
            "chargeId": charge_id,
            "status": "succeeded",
            "amount": amount,
            "amountFormatted": f"₹{amount:,.0f}",
            "currency": currency.lower(),
            "method": {
                "type": "card",
                "brand": random.choice(["visa", "mastercard", "rupay"]),
                "last4": f"{random.randint(1000, 9999)}",
                "expMonth": random.randint(1, 12),
                "expYear": random.randint(2026, 2029),
            },
            "receipt": {
                "url": f"https://receipts.drift.ai/{booking_ref.lower()}",
                "number": f"RCP-{_random_alpha(8)}",
                "email": "sent",
            },
            "metadata": {
                "bookingRef": booking_ref,
                "service": "drift-travel",
                "environment": "test",
            },
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }

    # =========================================================================
    # Step 4: Mock Document Generation
    # =========================================================================

    def _mock_documents(
        self,
        booking_ref: str,
        flights: list[dict[str, Any]],
        hotels: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Generate mock document URLs and QR codes."""
        qr_codes: list[dict[str, Any]] = []

        # Main booking QR
        qr_codes.append({
            "label": f"Booking: {booking_ref}",
            "type": "booking",
            "data": json.dumps({"ref": booking_ref, "url": f"https://drift.travel/b/{booking_ref}"}),
            "imageUrl": f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=DRIFT-{booking_ref}",
        })

        # Flight QR codes (boarding pass style)
        for flight in flights:
            ticket = flight.get("ticket", {})
            flight_num = ticket.get("flightNumber", flight.get("flightNumber", ""))
            pnr = flight.get("pnr", "")
            qr_codes.append({
                "label": f"Flight: {flight_num}",
                "type": "flight",
                "data": json.dumps({
                    "pnr": pnr,
                    "flight": flight_num,
                    "seat": ticket.get("seat", ""),
                    "gate": ticket.get("departure", {}).get("gate", ""),
                }),
                "imageUrl": f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PNR-{pnr}-{flight_num}",
            })

        # Hotel QR codes
        for hotel in hotels:
            res_id = hotel.get("reservationId", "")
            hotel_name = hotel.get("hotel", {}).get("name", "Hotel")
            qr_codes.append({
                "label": f"Hotel: {hotel_name}",
                "type": "hotel",
                "data": json.dumps({"reservationId": res_id, "hotel": hotel_name}),
                "imageUrl": f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=RES-{res_id}",
            })

        return {
            "pdf": {
                "url": f"https://drift.travel/docs/{booking_ref}/itinerary.pdf",
                "status": "generated",
                "pages": random.randint(4, 8),
            },
            "qrCodes": qr_codes,
            "emailConfirmation": {
                "status": "sent",
                "to": "user@email.com",
                "subject": f"DRIFT Booking Confirmation — {booking_ref}",
            },
        }

    # =========================================================================
    # Step 5: Save to Database
    # =========================================================================

    async def _save_to_database(
        self,
        booking_id: str,
        booking_ref: str,
        trip_id: str,
        user_id: str,
        flights: list[dict[str, Any]],
        hotels: list[dict[str, Any]],
        experiences: list[dict[str, Any]],
        payment: dict[str, Any],
        total_cost: float,
        currency: str,
    ) -> dict[str, str]:
        """Save booking to Cosmos DB (or graceful fallback)."""
        try:
            from db import get_db
            db = get_db()

            # Create booking record
            db.create_booking(
                trip_id=trip_id,
                user_id=user_id,
                flights=flights,
                hotels=hotels,
                experiences=experiences,
                total_cost=total_cost,
                currency=currency,
            )

            # Update trip status
            db.update_trip(trip_id, user_id, {
                "status": "booked",
                "bookingRef": booking_ref,
                "paymentId": payment.get("paymentId"),
            })

            logger.info(f"Booking {booking_ref} saved to Cosmos DB")
            return {"status": "saved", "database": "cosmos"}

        except Exception as e:
            logger.warning(f"DB save skipped (demo mode): {e}")
            return {"status": "demo_mode", "database": "in_memory"}
