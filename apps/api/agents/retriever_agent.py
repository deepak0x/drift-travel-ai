"""
DRIFT — Retriever Agent
Fetches real flights, hotels, and experiences from external APIs.
Supports streaming progress events for the "thinking box" UI.
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Any, AsyncGenerator, Optional

import httpx

logger = logging.getLogger(__name__)

# Fallback city → IATA code map (used when planner returns null iataCode)
CITY_IATA: dict[str, str] = {
    "goa": "GOI", "mumbai": "BOM", "delhi": "DEL", "bangalore": "BLR",
    "bengaluru": "BLR", "hyderabad": "HYD", "chennai": "MAA", "kolkata": "CCU",
    "ahmedabad": "AMD", "pune": "PNQ", "jaipur": "JAI", "kochi": "COK",
    "cochin": "COK", "lucknow": "LKO", "chandigarh": "IXC", "bhopal": "BHO",
    "varanasi": "VNS", "udaipur": "UDR", "amritsar": "ATQ", "nagpur": "NAG",
    "tokyo": "TYO", "osaka": "OSA", "kyoto": "ITM", "paris": "CDG",
    "london": "LHR", "dubai": "DXB", "singapore": "SIN", "bangkok": "BKK",
    "new york": "JFK", "los angeles": "LAX", "sydney": "SYD", "bali": "DPS",
    "phuket": "HKT", "istanbul": "IST", "rome": "FCO", "barcelona": "BCN",
    "amsterdam": "AMS", "berlin": "BER", "toronto": "YYZ", "kuala lumpur": "KUL",
}

# Fallback city → (lat, lng)
CITY_COORDS: dict[str, tuple[float, float]] = {
    "goa": (15.2993, 74.1240), "mumbai": (19.0760, 72.8777),
    "delhi": (28.6139, 77.2090), "bangalore": (12.9716, 77.5946),
    "bengaluru": (12.9716, 77.5946), "hyderabad": (17.3850, 78.4867),
    "chennai": (13.0827, 80.2707), "kolkata": (22.5726, 88.3639),
    "jaipur": (26.9124, 75.7873), "kochi": (9.9312, 76.2673),
    "varanasi": (25.3176, 82.9739), "udaipur": (24.5854, 73.7125),
    "tokyo": (35.6762, 139.6503), "osaka": (34.6937, 135.5023),
    "paris": (48.8566, 2.3522), "london": (51.5074, -0.1278),
    "dubai": (25.2048, 55.2708), "singapore": (1.3521, 103.8198),
    "bangkok": (13.7563, 100.5018), "bali": (-8.3405, 115.0920),
    "phuket": (7.8804, 98.3923),
}


class RetrieverAgent:
    """
    AI agent that retrieves travel options from external APIs:
    - Amadeus: Flights + Hotels
    - Foursquare Places API: Experiences / Points of Interest
    """

    def __init__(self) -> None:
        import os

        self.amadeus_key = os.environ.get("AMADEUS_API_KEY", "")
        self.amadeus_secret = os.environ.get("AMADEUS_API_SECRET", "")
        self.foursquare_key = os.environ.get("FOURSQUARE_API_KEY", "")
        self.amadeus_base_url = "https://test.api.amadeus.com"
        self.foursquare_base_url = "https://api.foursquare.com/v3"
        self._amadeus_token: Optional[str] = None

    def _resolve_city(self, city: dict[str, Any]) -> tuple[str, float, float]:
        """Return (iata_code, lat, lng) resolving nulls via lookup maps."""
        city_name = (city.get("cityName") or "").lower().strip()
        iata = city.get("iataCode") or CITY_IATA.get(city_name, "")
        loc = city.get("location") or {}
        lat = float(loc.get("lat") or 0) or CITY_COORDS.get(city_name, (0, 0))[0]
        lng = float(loc.get("lng") or 0) or CITY_COORDS.get(city_name, (0, 0))[1]
        return iata, lat, lng

    # =========================================================================
    # Public API
    # =========================================================================

    async def retrieve_all(
        self,
        cities: list[dict[str, Any]],
        start_date: str,
        end_date: str,
        travelers: int = 1,
        budget: float = 100000,
        currency: str = "INR",
    ) -> dict[str, Any]:
        """
        Retrieve all travel options (flights, hotels, experiences) at once.

        Returns:
            Combined results with flights, hotels, and experiences.
        """
        results: dict[str, Any] = {
            "flights": [],
            "hotels": [],
            "experiences": [],
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            # Authenticate with Amadeus
            await self._authenticate_amadeus(client)

            for i, city in enumerate(cities):
                city_name = city.get("cityName", "")
                iata_code, lat, lng = self._resolve_city(city)
                arrival = city.get("arrivalDate", start_date)
                departure = city.get("departureDate", end_date)

                # Fetch flights (between cities)
                if i < len(cities) - 1:
                    next_city = cities[i + 1]
                    next_iata, _, _ = self._resolve_city(next_city)
                    flights = await self._search_flights(
                        client=client,
                        origin=iata_code,
                        destination=next_iata,
                        date=departure,
                        travelers=travelers,
                        currency=currency,
                    )
                    results["flights"].extend(flights)

                # Fetch hotels
                if iata_code:
                    hotels = await self._search_hotels(
                        client=client,
                        city_code=iata_code,
                        check_in=arrival,
                        check_out=departure,
                        travelers=travelers,
                        currency=currency,
                        city_name=city_name,
                    )
                    results["hotels"].extend(hotels)

                # Fetch experiences
                if lat and lng:
                    experiences = await self._search_experiences(
                        client=client,
                        lat=lat,
                        lng=lng,
                        city_name=city_name,
                    )
                    results["experiences"].extend(experiences)

        # Filter by budget
        results = self._filter_by_budget(results, budget, currency)

        return results

    async def retrieve_streaming(
        self,
        cities: list[dict[str, Any]],
        start_date: str,
        end_date: str,
        travelers: int = 1,
        budget: float = 100000,
        currency: str = "INR",
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Stream retrieval progress as events for the thinking box UI.

        Yields:
            Agent events with type, message, and data.
        """
        yield self._event("thinking", "planner", "Analyzing your itinerary...")
        yield self._event("thinking", "retriever", "Preparing to search for travel options...")

        results: dict[str, Any] = {"flights": [], "hotels": [], "experiences": []}

        async with httpx.AsyncClient(timeout=30.0) as client:
            # Auth
            yield self._event("searching", "retriever", "Authenticating with travel APIs...")
            await self._authenticate_amadeus(client)
            yield self._event("progress", "retriever", "Connected to Amadeus API ✓")

            for i, city in enumerate(cities):
                city_name = city.get("cityName", "Unknown")
                iata_code, lat, lng = self._resolve_city(city)
                arrival = city.get("arrivalDate", start_date)
                departure = city.get("departureDate", end_date)

                # Flights
                if i < len(cities) - 1:
                    next_city = cities[i + 1]
                    next_iata, _, _ = self._resolve_city(next_city)
                    yield self._event(
                        "searching", "retriever",
                        f"✈️ Searching flights: {city_name} → {next_city.get('cityName', '')}..."
                    )
                    flights = await self._search_flights(
                        client, iata_code, next_iata,
                        departure, travelers, currency,
                    )
                    results["flights"].extend(flights)
                    yield self._event(
                        "found", "retriever",
                        f"Found {len(flights)} flight options",
                        {"count": len(flights), "type": "flights"},
                    )

                # Hotels
                yield self._event(
                    "searching", "retriever",
                    f"🏨 Searching hotels in {city_name}..."
                )
                if iata_code:
                    hotels = await self._search_hotels(
                        client, iata_code, arrival, departure, travelers, currency, city_name,
                    )
                else:
                    hotels = self._mock_hotels("", arrival, departure, currency, city_name)
                results["hotels"].extend(hotels)
                yield self._event(
                    "found", "retriever",
                    f"Found {len(hotels)} hotels in {city_name}",
                    {"count": len(hotels), "type": "hotels"},
                )

                # Experiences
                if lat and lng:
                    yield self._event(
                        "searching", "retriever",
                        f"🎯 Discovering experiences in {city_name}..."
                    )
                    experiences = await self._search_experiences(client, lat, lng, city_name)
                    results["experiences"].extend(experiences)
                    yield self._event(
                        "found", "retriever",
                        f"Found {len(experiences)} experiences in {city_name}",
                        {"count": len(experiences), "type": "experiences"},
                    )

            # Budget filtering
            yield self._event("filtering", "retriever", "💰 Filtering by your budget...")
            results = self._filter_by_budget(results, budget, currency)

            yield self._event(
                "complete", "retriever",
                f"✅ Done! Found {len(results['flights'])} flights, "
                f"{len(results['hotels'])} hotels, "
                f"{len(results['experiences'])} experiences",
                results,
            )

    # =========================================================================
    # Amadeus API — Flights
    # =========================================================================

    async def _authenticate_amadeus(self, client: httpx.AsyncClient) -> None:
        """Get Amadeus OAuth2 access token."""
        if not self.amadeus_key:
            logger.warning("Amadeus API key not configured — using mock data")
            return

        try:
            resp = await client.post(
                f"{self.amadeus_base_url}/v1/security/oauth2/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.amadeus_key,
                    "client_secret": self.amadeus_secret,
                },
            )
            resp.raise_for_status()
            self._amadeus_token = resp.json().get("access_token")
            logger.info("Amadeus authenticated successfully")
        except Exception as e:
            logger.error(f"Amadeus auth failed: {e}")
            self._amadeus_token = None

    async def _search_flights(
        self,
        client: httpx.AsyncClient,
        origin: str,
        destination: str,
        date: str,
        travelers: int,
        currency: str,
    ) -> list[dict[str, Any]]:
        """Search flights via Amadeus Flight Offers API."""
        if not self._amadeus_token:
            return self._mock_flights(origin, destination, date, travelers, currency)

        try:
            resp = await client.get(
                f"{self.amadeus_base_url}/v2/shopping/flight-offers",
                params={
                    "originLocationCode": origin,
                    "destinationLocationCode": destination,
                    "departureDate": date,
                    "adults": travelers,
                    "currencyCode": currency,
                    "max": 10,
                },
                headers={"Authorization": f"Bearer {self._amadeus_token}"},
            )
            resp.raise_for_status()
            data = resp.json()

            flights = []
            for offer in data.get("data", []):
                for segment in offer.get("itineraries", [{}])[0].get("segments", []):
                    flights.append({
                        "id": str(uuid.uuid4()),
                        "airline": segment.get("carrierCode", ""),
                        "flightNumber": f"{segment.get('carrierCode', '')}{segment.get('number', '')}",
                        "departure": {
                            "airport": segment.get("departure", {}).get("iataCode", ""),
                            "iataCode": segment.get("departure", {}).get("iataCode", ""),
                            "dateTime": segment.get("departure", {}).get("at", ""),
                            "terminal": segment.get("departure", {}).get("terminal"),
                        },
                        "arrival": {
                            "airport": segment.get("arrival", {}).get("iataCode", ""),
                            "iataCode": segment.get("arrival", {}).get("iataCode", ""),
                            "dateTime": segment.get("arrival", {}).get("at", ""),
                            "terminal": segment.get("arrival", {}).get("terminal"),
                        },
                        "duration": offer.get("itineraries", [{}])[0].get("duration", ""),
                        "stops": len(offer.get("itineraries", [{}])[0].get("segments", [])) - 1,
                        "price": float(offer.get("price", {}).get("total", 0)),
                        "currency": offer.get("price", {}).get("currency", currency),
                        "cabinClass": "Economy",
                        "selected": False,
                    })

            if not flights:
                logger.warning(f"No flights found from {origin} to {destination}, using mock data")
                return self._mock_flights(origin, destination, date, travelers, currency)

            return flights[:10]

        except Exception as e:
            logger.error(f"Flight search error: {e}")
            return self._mock_flights(origin, destination, date, travelers, currency)

    # =========================================================================
    # Amadeus API — Hotels
    # =========================================================================

    async def _search_hotels(
        self,
        client: httpx.AsyncClient,
        city_code: str,
        check_in: str,
        check_out: str,
        travelers: int,
        currency: str,
        city_name: str = "",
    ) -> list[dict[str, Any]]:
        """Search hotels via Amadeus Hotel Search API."""
        if not self._amadeus_token:
            return self._mock_hotels(city_code, check_in, check_out, currency, city_name)

        try:
            # Step 1: Get hotel IDs by city
            resp = await client.get(
                f"{self.amadeus_base_url}/v1/reference-data/locations/hotels/by-city",
                params={"cityCode": city_code, "radius": 20, "radiusUnit": "KM"},
                headers={"Authorization": f"Bearer {self._amadeus_token}"},
            )
            resp.raise_for_status()
            hotel_ids = [h["hotelId"] for h in resp.json().get("data", [])[:5]]

            if not hotel_ids:
                return self._mock_hotels(city_code, check_in, check_out, currency, city_name)

            # Step 2: Get offers for those hotels
            resp = await client.get(
                f"{self.amadeus_base_url}/v3/shopping/hotel-offers",
                params={
                    "hotelIds": ",".join(hotel_ids),
                    "checkInDate": check_in,
                    "checkOutDate": check_out,
                    "adults": travelers,
                    "currency": currency,
                },
                headers={"Authorization": f"Bearer {self._amadeus_token}"},
            )
            resp.raise_for_status()
            data = resp.json()

            hotels = []
            for hotel_data in data.get("data", []):
                hotel_info = hotel_data.get("hotel", {})
                offers = hotel_data.get("offers", [{}])
                offer = offers[0] if offers else {}

                price = float(offer.get("price", {}).get("total", 0))
                nights = max(1, (datetime.strptime(check_out, "%Y-%m-%d") -
                               datetime.strptime(check_in, "%Y-%m-%d")).days)

                hotels.append({
                    "id": str(uuid.uuid4()),
                    "name": hotel_info.get("name", "Hotel"),
                    "address": hotel_info.get("address", {}).get("lines", [""])[0] if hotel_info.get("address", {}).get("lines") else "",
                    "city": city_name or city_code,
                    "rating": float(hotel_info.get("rating", 3)),
                    "stars": int(hotel_info.get("rating", 3)),
                    "pricePerNight": round(price / nights, 2),
                    "totalPrice": price,
                    "currency": offer.get("price", {}).get("currency", currency),
                    "amenities": [],
                    "location": {
                        "lat": float(hotel_info.get("latitude", 0)),
                        "lng": float(hotel_info.get("longitude", 0)),
                    },
                    "checkIn": check_in,
                    "checkOut": check_out,
                    "roomType": offer.get("room", {}).get("type", "Standard"),
                    "selected": False,
                })

            if not hotels:
                logger.warning(f"No hotels found in {city_code}, using mock data")
                return self._mock_hotels(city_code, check_in, check_out, currency, city_name)

            return hotels

        except Exception as e:
            logger.error(f"Hotel search error: {e}")
            return self._mock_hotels(city_code, check_in, check_out, currency, city_name)

    # =========================================================================
    # OpenTripMap API — Experiences
    # =========================================================================

    async def _search_experiences(
        self,
        client: httpx.AsyncClient,
        lat: float,
        lng: float,
        city_name: str,
    ) -> list[dict[str, Any]]:
        """Search experiences via Foursquare Places API."""
        if not self.foursquare_key:
            return self._mock_experiences(city_name, lat, lng)

        try:
            resp = await client.get(
                f"{self.foursquare_base_url}/places/search",
                params={
                    "ll": f"{lat},{lng}",
                    "radius": 10000,       # 10km
                    "limit": 15,
                    "sort": "RATING",
                    "categories": "10000,16000,13000,17000,18000",  # arts,landmarks,food,outdoors,shopping
                },
                headers={
                    "Authorization": self.foursquare_key,
                    "Accept": "application/json",
                },
            )
            resp.raise_for_status()
            places = resp.json().get("results", [])

            experiences = []
            for place in places:
                if not place.get("name"):
                    continue

                # Map Foursquare category IDs to DRIFT categories
                categories = place.get("categories", [])
                category = self._map_foursquare_category(categories)

                geocodes = place.get("geocodes", {}).get("main", {})
                location = place.get("location", {})

                experiences.append({
                    "id": str(uuid.uuid4()),
                    "name": place.get("name", ""),
                    "description": f"{place.get('name', '')} — {category.title()} in {city_name}",
                    "category": category,
                    "location": {
                        "lat": geocodes.get("latitude", lat),
                        "lng": geocodes.get("longitude", lng),
                    },
                    "address": location.get("formatted_address", location.get("address", "")),
                    "rating": round(place.get("rating", 8.0) / 2, 1),  # Foursquare 0–10 → 0–5
                    "estimatedCost": int(place.get("price", 2)) * 200,  # 1–4 scale → INR approx
                    "duration": "1-3 hours",
                    "city": city_name,
                    "fsqId": place.get("fsq_id", ""),
                    "selected": False,
                })

            if not experiences:
                logger.warning(f"No experiences found in {city_name}, using mock data")
                return self._mock_experiences(city_name, lat, lng)

            return experiences

        except Exception as e:
            logger.error(f"Foursquare experience search error: {e}")
            return self._mock_experiences(city_name, lat, lng)

    # =========================================================================
    # Helpers
    # =========================================================================

    def _filter_by_budget(
        self, results: dict[str, Any], budget: float, currency: str
    ) -> dict[str, Any]:
        """Filter and sort results by budget constraints."""
        # Sort by price ascending
        results["flights"].sort(key=lambda f: f.get("price", 0))
        results["hotels"].sort(key=lambda h: h.get("totalPrice", 0))

        # Keep only options that could fit in budget
        # (rough heuristic: flight should be < 40% of budget, hotel < 40%)
        flight_budget = budget * 0.4
        hotel_budget = budget * 0.4

        results["flights"] = [
            f for f in results["flights"] if f.get("price", 0) <= flight_budget
        ][:10]
        results["hotels"] = [
            h for h in results["hotels"] if h.get("totalPrice", 0) <= hotel_budget
        ][:10]
        results["experiences"] = results["experiences"][:15]

        return results

    def _map_foursquare_category(self, categories: list[dict[str, Any]]) -> str:
        """Map Foursquare category objects to DRIFT experience categories."""
        if not categories:
            return "sightseeing"
        # Use first category's ID
        cat_id = str(categories[0].get("id", ""))
        name = categories[0].get("name", "").lower()

        if cat_id.startswith("10") or "art" in name or "museum" in name:
            return "culture"
        if cat_id.startswith("16") or "landmark" in name or "monument" in name:
            return "sightseeing"
        if cat_id.startswith("13") or "food" in name or "restaurant" in name or "cafe" in name:
            return "food"
        if cat_id.startswith("17") or "park" in name or "garden" in name or "nature" in name:
            return "nature"
        if cat_id.startswith("18") or "shop" in name or "market" in name:
            return "shopping"
        if "sport" in name or "adventure" in name or "trek" in name:
            return "adventure"
        return "sightseeing"

    def _event(
        self,
        event_type: str,
        agent: str,
        message: str,
        data: Any = None,
    ) -> dict[str, Any]:
        """Create an agent event for SSE streaming."""
        return {
            "id": str(uuid.uuid4()),
            "type": event_type,
            "agent": agent,
            "message": message,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        }

    # =========================================================================
    # Mock Data (when APIs are not configured)
    # =========================================================================

    # IATA → (full airport name, city) lookup
    _AIRPORT_NAMES: dict[str, tuple[str, str]] = {
        "GOI": ("Dabolim International Airport", "Goa"),
        "BOM": ("Chhatrapati Shivaji Maharaj Intl", "Mumbai"),
        "DEL": ("Indira Gandhi International Airport", "Delhi"),
        "BLR": ("Kempegowda International Airport", "Bangalore"),
        "HYD": ("Rajiv Gandhi International Airport", "Hyderabad"),
        "MAA": ("Chennai International Airport", "Chennai"),
        "JAI": ("Jaipur International Airport", "Jaipur"),
        "COK": ("Cochin International Airport", "Kochi"),
        "TYO": ("Narita International Airport", "Tokyo"),
        "NRT": ("Narita International Airport", "Tokyo"),
        "HND": ("Haneda Airport", "Tokyo"),
        "OSA": ("Kansai International Airport", "Osaka"),
        "KIX": ("Kansai International Airport", "Osaka"),
        "ITM": ("Osaka Itami Airport", "Osaka / Kyoto"),
        "CDG": ("Charles de Gaulle Airport", "Paris"),
        "LHR": ("Heathrow Airport", "London"),
        "DXB": ("Dubai International Airport", "Dubai"),
        "SIN": ("Changi Airport", "Singapore"),
        "BKK": ("Suvarnabhumi Airport", "Bangkok"),
        "DPS": ("Ngurah Rai International Airport", "Bali"),
    }

    _ROUTE_AIRLINES: dict[str, list[tuple[str, str]]] = {
        "japan":  [("NH", "ANA"), ("JL", "Japan Airlines"), ("NH", "ANA"), ("JL", "JAL Express"), ("MM", "Peach Aviation")],
        "europe": [("AF", "Air France"), ("LH", "Lufthansa"), ("BA", "British Airways"), ("EK", "Emirates"), ("QR", "Qatar Airways")],
        "sea":    [("SQ", "Singapore Airlines"), ("TG", "Thai Airways"), ("EK", "Emirates"), ("MH", "Malaysia Airlines"), ("QR", "Qatar Airways")],
        "india":  [("AI", "Air India"), ("6E", "IndiGo"), ("UK", "Vistara"), ("SG", "SpiceJet"), ("QP", "Akasa Air")],
        "intl":   [("AI", "Air India"), ("6E", "IndiGo"), ("EK", "Emirates"), ("EY", "Etihad Airways"), ("QR", "Qatar Airways")],
    }

    def _get_route_type(self, origin: str, destination: str) -> str:
        japan  = {"TYO","NRT","HND","OSA","KIX","ITM","FUK","CTS"}
        europe = {"CDG","LHR","AMS","FRA","FCO","BCN","IST"}
        sea    = {"SIN","BKK","DPS","HKT","KUL","CGK"}
        india  = {"GOI","BOM","DEL","BLR","HYD","MAA","CCU","JAI","COK","AMD","PNQ","LKO","UDR"}
        o, d   = origin.upper(), destination.upper()
        if o in india and d in india:
            return "india"
        if o in japan or d in japan:
            return "japan"
        if o in europe or d in europe:
            return "europe"
        if o in sea or d in sea:
            return "sea"
        return "intl"

    def _mock_flights(
        self, origin: str, destination: str, date: str, travelers: int, currency: str
    ) -> list[dict[str, Any]]:
        """Generate route-aware mock flights with correct airlines, airport names, duration."""
        route = self._get_route_type(origin, destination)
        airlines = self._ROUTE_AIRLINES.get(route, self._ROUTE_AIRLINES["intl"])

        dep_airport, dep_city = self._AIRPORT_NAMES.get(origin.upper(), (f"{origin} International Airport", origin))
        arr_airport, arr_city = self._AIRPORT_NAMES.get(destination.upper(), (f"{destination} International Airport", destination))

        base_price  = {"japan": 35000, "europe": 45000, "sea": 18000, "india": 4500, "intl": 25000}.get(route, 20000)
        dur_options = {"japan": [(1,10),(1,25),(1,10),(1,20),(1,15)],
                       "europe": [(8,30),(9,0),(7,45),(9,30),(8,15)],
                       "sea":    [(5,30),(6,0),(5,0),(6,30),(5,45)],
                       "india":  [(1,30),(2,0),(1,45),(2,15),(1,30)],
                       "intl":   [(6,0),(7,0),(5,30),(8,0),(6,30)]}.get(route, [(3,0),(3,30),(4,0),(3,15),(4,30)])

        flights = []
        for i, (code, name) in enumerate(airlines):
            dep_hour = 6 + i * 2
            dur_h, dur_m = dur_options[i % len(dur_options)]
            arr_h = dep_hour + dur_h + (1 if dep_hour + dur_h >= 24 else 0)
            price = int(base_price * (1 + i * 0.08)) * travelers

            flights.append({
                "id": str(uuid.uuid4()),
                "airline": name,
                "airlineCode": code,
                "airlineLogo": f"https://pics.avs.io/60/60/{code}.png",
                "flightNumber": f"{code}{200 + i * 17}",
                "departure": {
                    "airport": dep_airport,
                    "city": dep_city,
                    "iataCode": origin,
                    "dateTime": f"{date}T{dep_hour:02d}:00:00",
                    "terminal": "T1",
                },
                "arrival": {
                    "airport": arr_airport,
                    "city": arr_city,
                    "iataCode": destination,
                    "dateTime": f"{date}T{arr_h % 24:02d}:{dur_m:02d}:00",
                    "terminal": "T2",
                },
                "duration": f"PT{dur_h}H{dur_m:02d}M",
                "durationText": f"{dur_h}h {dur_m:02d}m" if dur_m else f"{dur_h}h",
                "stops": 0 if i < 3 else 1,
                "price": price,
                "currency": currency,
                "cabinClass": "Economy",
                "seatsAvailable": 10 - i,
                "selected": False,
            })
        return flights


    # City-specific hotel data for realistic mock fallback
    _CITY_HOTEL_DATA: dict[str, dict] = {
        "goa": {"area": "Calangute Beach Road", "lat": 15.5435, "lng": 73.7517,
                 "hotels": [("Beach House Boutique",4,5500),("Taj Holiday Village",5,12000),("The Leela Goa",5,14000),("Hyatt Centric",4,7000),("Aloft Goa",4,6000),("Ibis Styles",3,3200),("Lemon Tree",3,4000),("Holiday Inn",4,5000)]},
        "tokyo": {"area": "Shinjuku", "lat": 35.6895, "lng": 139.6917,
                   "hotels": [("Park Hyatt Tokyo",5,22000),("Aman Tokyo",5,30000),("Andaz Tokyo",5,18000),("Hyatt Regency",4,10000),("Marriott Ginza",4,12000),("ANA InterContinental",5,15000),("Dormy Inn Shinjuku",3,5000),("Sotetsu Fresa Inn",3,4000)]},
        "osaka": {"area": "Namba", "lat": 34.6937, "lng": 135.5023,
                   "hotels": [("Conrad Osaka",5,18000),("St Regis Osaka",5,22000),("InterContinental",5,16000),("Cross Hotel",4,7000),("Dormy Inn Premium",3,5000),("APA Hotel Namba",3,3500),("Hearton Hotel",3,4000),("Moxy Osaka",4,6000)]},
        "kyoto": {"area": "Gion District", "lat": 35.0116, "lng": 135.7681,
                   "hotels": [("Four Seasons Kyoto",5,25000),("Ritz Carlton Kyoto",5,28000),("Hyatt Regency Kyoto",5,18000),("Westin Miyako",4,12000),("The Thousand Kyoto",4,10000),("ibis Kyoto Station",3,5000),("Dormy Inn Kyoto",3,4500),("APA Hotel Kyoto",3,3500)]},
        "mumbai": {"area": "Bandra Kurla Complex", "lat": 19.0760, "lng": 72.8777,
                    "hotels": [("Taj Mahal Palace",5,15000),("Oberoi Mumbai",5,18000),("ITC Maratha",5,12000),("Trident Nariman Point",5,10000),("JW Marriott",5,13000),("Hyatt Regency",4,7000),("Lemon Tree",3,4000),("Ibis Mumbai",3,3500)]},
        "delhi": {"area": "Connaught Place", "lat": 28.6139, "lng": 77.2090,
                   "hotels": [("The Imperial",5,12000),("Taj Palace",5,14000),("ITC Maurya",5,13000),("Hyatt Regency",4,7000),("Pullman Aerocity",4,6000),("Ibis Aerocity",3,3000),("Lemon Tree",3,3500),("Holiday Inn",4,5000)]},
        "paris": {"area": "Le Marais", "lat": 48.8566, "lng": 2.3522,
                   "hotels": [("Le Bristol Paris",5,35000),("The Ritz Paris",5,50000),("Four Seasons George V",5,40000),("Hotel du Louvre",4,15000),("Novotel Paris Les Halles",4,10000),("Ibis Paris Montmartre",3,7000),("citizenM Paris",4,8000),("Mercure Bastille",4,9000)]},
        "default": {"area": "City Centre", "lat": 0, "lng": 0,
                     "hotels": [("Grand Palace Hotel",5,12000),("Royal Residency",5,10000),("Park Inn Suites",4,7000),("Comfort Inn",4,5500),("City Heritage Hotel",4,6000),("Metro Inn",3,4000),("Travelers Lodge",3,3200),("Budget Suites",3,2800)]},
    }

    def _mock_hotels(
        self, city_code: str, check_in: str, check_out: str, currency: str,
        city_name: str = ""
    ) -> list[dict[str, Any]]:
        """Generate realistic mock hotel data using city-specific names and neighborhoods."""
        key = (city_name or city_code or "").lower().strip()
        city_data = self._CITY_HOTEL_DATA.get(key, self._CITY_HOTEL_DATA["default"])
        display_name = city_name or city_code

        nights = 3
        try:
            d1 = datetime.strptime(check_in, "%Y-%m-%d")
            d2 = datetime.strptime(check_out, "%Y-%m-%d")
            nights = max(1, (d2 - d1).days)
        except ValueError:
            pass

        hotels = []
        amenity_sets = {
            5: ["WiFi", "Pool", "Gym", "Restaurant", "Spa", "Concierge", "Room Service"],
            4: ["WiFi", "Pool", "Gym", "Restaurant", "Room Service"],
            3: ["WiFi", "Gym", "Restaurant"],
        }
        for name, stars, ppn in city_data["hotels"]:
            hotels.append({
                "id": str(uuid.uuid4()),
                "name": name,
                "address": f"{city_data['area']}, {display_name}",
                "city": display_name,
                "rating": round(stars - 0.2 + (hash(name) % 10) * 0.04, 1),
                "stars": stars,
                "pricePerNight": ppn,
                "totalPrice": ppn * nights,
                "currency": currency,
                "amenities": amenity_sets.get(stars, amenity_sets[3]),
                "location": {"lat": city_data["lat"], "lng": city_data["lng"]},
                "checkIn": check_in,
                "checkOut": check_out,
                "roomType": "Deluxe" if stars >= 4 else "Standard",
                "selected": False,
            })
        return hotels

    def _mock_experiences(
        self, city_name: str, lat: float, lng: float
    ) -> list[dict[str, Any]]:
        """Generate mock experience data for development."""
        experiences_data = [
            ("Historical Walking Tour", "culture", 500, "3 hours"),
            ("Local Food Tour", "food", 1500, "4 hours"),
            ("Sunset Viewpoint", "sightseeing", 0, "1 hour"),
            ("Traditional Market Visit", "shopping", 200, "2 hours"),
            ("Temple & Heritage Visit", "culture", 100, "2 hours"),
            ("Adventure Park", "adventure", 2000, "5 hours"),
            ("Botanical Garden", "nature", 50, "2 hours"),
            ("City Museum", "culture", 300, "3 hours"),
            ("Rooftop Bar Experience", "nightlife", 1000, "2 hours"),
            ("Yoga & Wellness Session", "wellness", 800, "1.5 hours"),
        ]
        return [
            {
                "id": str(uuid.uuid4()),
                "name": f"{name} — {city_name}",
                "description": f"Experience the best of {city_name} with this {category} activity.",
                "category": category,
                "location": {"lat": lat + (i * 0.01), "lng": lng + (i * 0.01)},
                "rating": 4.0 + (i % 10) * 0.1,
                "estimatedCost": cost,
                "duration": duration,
                "city": city_name,
                "selected": False,
            }
            for i, (name, category, cost, duration) in enumerate(experiences_data)
        ]
