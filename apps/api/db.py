"""
DRIFT — Cosmos DB Client
CRUD operations for users, trips, and bookings containers.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from azure.cosmos import CosmosClient, PartitionKey, exceptions

from config import get_config

logger = logging.getLogger(__name__)


class CosmosDB:
    """Cosmos DB client for DRIFT data operations."""

    def __init__(self) -> None:
        config = get_config()
        self.client = CosmosClient(config.cosmos_endpoint, config.cosmos_key)
        self.database = self.client.get_database_client(config.cosmos_database)
        self.users = self.database.get_container_client("users")
        self.trips = self.database.get_container_client("trips")
        self.bookings = self.database.get_container_client("bookings")

    # -------------------------------------------------------------------------
    # Users
    # -------------------------------------------------------------------------
    def get_user(self, user_id: str) -> Optional[dict[str, Any]]:
        """Get a user by ID."""
        try:
            return self.users.read_item(item=user_id, partition_key=user_id)
        except exceptions.CosmosResourceNotFoundError:
            return None

    def create_user(self, name: str, email: str) -> dict[str, Any]:
        """Create a new user."""
        user = {
            "id": str(uuid.uuid4()),
            "userId": "",  # will be set to id
            "name": name,
            "email": email,
            "preferences": {"currency": "INR"},
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
        user["userId"] = user["id"]
        return self.users.create_item(body=user)

    # -------------------------------------------------------------------------
    # Trips
    # -------------------------------------------------------------------------
    def get_trip(self, trip_id: str, user_id: str) -> Optional[dict[str, Any]]:
        """Get a trip by ID."""
        try:
            return self.trips.read_item(item=trip_id, partition_key=user_id)
        except exceptions.CosmosResourceNotFoundError:
            return None

    def get_user_trips(self, user_id: str) -> list[dict[str, Any]]:
        """Get all trips for a user."""
        query = "SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC"
        params = [{"name": "@userId", "value": user_id}]
        return list(
            self.trips.query_items(
                query=query, parameters=params, partition_key=user_id
            )
        )

    def create_trip(self, user_id: str, trip_input: dict[str, Any]) -> dict[str, Any]:
        """Create a new trip."""
        trip = {
            "id": str(uuid.uuid4()),
            "userId": user_id,
            "status": "planning",
            "input": trip_input,
            "itinerary": None,
            "cities": [],
            "budget": {
                "total": trip_input.get("budget", 0),
                "spent": 0,
                "remaining": trip_input.get("budget", 0),
                "currency": trip_input.get("currency", "INR"),
                "breakdown": {
                    "flights": 0,
                    "hotels": 0,
                    "experiences": 0,
                    "other": 0,
                },
            },
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }
        return self.trips.create_item(body=trip)

    def update_trip(
        self, trip_id: str, user_id: str, updates: dict[str, Any]
    ) -> dict[str, Any]:
        """Update a trip with partial data."""
        trip = self.get_trip(trip_id, user_id)
        if not trip:
            raise ValueError(f"Trip {trip_id} not found")

        for key, value in updates.items():
            trip[key] = value
        trip["updatedAt"] = datetime.now(timezone.utc).isoformat()

        return self.trips.replace_item(item=trip_id, body=trip)

    # -------------------------------------------------------------------------
    # Bookings
    # -------------------------------------------------------------------------
    def get_booking(
        self, booking_id: str, trip_id: str
    ) -> Optional[dict[str, Any]]:
        """Get a booking by ID."""
        try:
            return self.bookings.read_item(
                item=booking_id, partition_key=trip_id
            )
        except exceptions.CosmosResourceNotFoundError:
            return None

    def create_booking(
        self,
        trip_id: str,
        user_id: str,
        flights: list[dict],
        hotels: list[dict],
        experiences: list[dict],
        total_cost: float,
        currency: str,
    ) -> dict[str, Any]:
        """Create a new booking."""
        booking = {
            "id": str(uuid.uuid4()),
            "tripId": trip_id,
            "userId": user_id,
            "flights": flights,
            "hotels": hotels,
            "experiences": experiences,
            "totalCost": total_cost,
            "currency": currency,
            "status": "pending",
            "paymentId": None,
            "pdfUrl": None,
            "qrCodes": [],
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
        return self.bookings.create_item(body=booking)

    def update_booking(
        self, booking_id: str, trip_id: str, updates: dict[str, Any]
    ) -> dict[str, Any]:
        """Update a booking."""
        booking = self.get_booking(booking_id, trip_id)
        if not booking:
            raise ValueError(f"Booking {booking_id} not found")

        for key, value in updates.items():
            booking[key] = value

        return self.bookings.replace_item(item=booking_id, body=booking)


# Singleton instance
_db: Optional[CosmosDB] = None


def get_db() -> CosmosDB:
    """Get or create the singleton CosmosDB instance."""
    global _db
    if _db is None:
        _db = CosmosDB()
    return _db
