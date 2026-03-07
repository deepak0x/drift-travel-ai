"use client";

/**
 * DRIFT — Plan Page / Agent Thinking Box
 * Screen 2: Shows SSE stream of live agent status steps
 */

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTrip } from "@/lib/store";
import type { AgentEvent } from "@/lib/store";

// Mock events for when API isn't connected
const mockEvents: Omit<AgentEvent, "id" | "timestamp">[] = [
    { type: "thinking", agent: "planner", message: "Understanding your travel preferences..." },
    { type: "thinking", agent: "planner", message: "Analyzing destination: checking weather, festivals, and local events..." },
    { type: "progress", agent: "planner", message: "Creating day-by-day itinerary..." },
    { type: "searching", agent: "planner", message: "Optimizing route between cities..." },
    { type: "progress", agent: "planner", message: "Balancing activities with your 'moderate' pace..." },
    { type: "found", agent: "planner", message: "Itinerary draft ready ✓" },
    { type: "thinking", agent: "retriever", message: "Preparing to search live travel data..." },
    { type: "searching", agent: "retriever", message: "✈️ Searching flights on Amadeus..." },
    { type: "found", agent: "retriever", message: "Found 5 flight options" },
    { type: "searching", agent: "retriever", message: "🏨 Searching hotels..." },
    { type: "found", agent: "retriever", message: "Found 8 hotels matching your budget" },
    { type: "searching", agent: "retriever", message: "🎯 Discovering local experiences..." },
    { type: "found", agent: "retriever", message: "Found 10 curated experiences" },
    { type: "filtering", agent: "retriever", message: "💰 Filtering by your budget..." },
    { type: "complete", agent: "retriever", message: "✅ All options ready! Proceeding to customization..." },
];

export default function PlanPage() {
    const router = useRouter();
    const { state, dispatch } = useTrip();
    const [events, setEvents] = useState<AgentEvent[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!state.input) {
            router.push("/");
            return;
        }

        // Simulate agent thinking with mock events
        let idx = 0;
        const interval = setInterval(() => {
            if (idx >= mockEvents.length) {
                clearInterval(interval);
                setIsComplete(true);

                // Generate mock itinerary data
                const mockItinerary = generateMockItinerary(state.input!);
                dispatch({ type: "SET_ITINERARY", payload: mockItinerary });
                dispatch({ type: "SET_TRIP_ID", payload: `trip-${Date.now()}` });

                // Generate mock options
                dispatch({
                    type: "SET_OPTIONS",
                    payload: {
                        flights: generateMockFlights(),
                        hotels: generateMockHotels(),
                        experiences: generateMockExperiences(state.input!.destination),
                    },
                });

                return;
            }

            const event: AgentEvent = {
                ...mockEvents[idx],
                id: `evt-${idx}`,
                timestamp: new Date().toISOString(),
            };
            setEvents((prev) => [...prev, event]);
            dispatch({ type: "ADD_AGENT_EVENT", payload: event });
            idx++;
        }, 800);

        return () => clearInterval(interval);
    }, [state.input, dispatch, router]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [events]);

    const handleContinue = () => {
        dispatch({ type: "SET_STEP", payload: "customizing" });
        router.push("/customize");
    };

    return (
        <div
            style={{
                minHeight: "calc(100vh - 60px)",
                padding: "2rem 1rem",
                maxWidth: "800px",
                margin: "0 auto",
            }}
        >
            {/* Title */}
            <div className="animate-fade-in" style={{ textAlign: "center", marginBottom: "2rem" }}>
                <h1
                    className="gradient-text"
                    style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}
                >
                    {isComplete ? "Your trip is ready! 🎉" : "AI Agents at work..."}
                </h1>
                <p style={{ color: "#94a3b8" }}>
                    {isComplete
                        ? `Perfect itinerary for ${state.input?.destination}`
                        : `Planning your trip to ${state.input?.destination || "..."}`}
                </p>
            </div>

            {/* Thinking Box */}
            <div
                className="glass"
                style={{
                    borderRadius: "1.25rem",
                    overflow: "hidden",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: "1rem 1.5rem",
                        borderBottom: "1px solid rgba(99, 102, 241, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div
                            style={{
                                width: "10px",
                                height: "10px",
                                borderRadius: "50%",
                                background: isComplete ? "#10b981" : "#6366f1",
                                boxShadow: isComplete
                                    ? "0 0 10px rgba(16, 185, 129, 0.5)"
                                    : "0 0 10px rgba(99, 102, 241, 0.5)",
                            }}
                            className={isComplete ? "" : "animate-pulse-glow"}
                        />
                        <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                            Agent Activity
                        </span>
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        {events.length} / {mockEvents.length} steps
                    </span>
                </div>

                {/* Events Stream */}
                <div
                    ref={scrollRef}
                    style={{
                        maxHeight: "450px",
                        overflowY: "auto",
                        padding: "0.5rem",
                    }}
                >
                    {events.map((event, i) => (
                        <div
                            key={event.id}
                            className={`thinking-step ${i === events.length - 1 && !isComplete ? "active" : ""
                                }`}
                            style={{ animationDelay: `${i * 0.05}s` }}
                        >
                            <div className={`thinking-dot ${event.type}`} />
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span
                                        style={{
                                            fontSize: "0.7rem",
                                            fontWeight: 600,
                                            textTransform: "uppercase",
                                            color:
                                                event.agent === "planner"
                                                    ? "#818cf8"
                                                    : event.agent === "retriever"
                                                        ? "#06b6d4"
                                                        : "#10b981",
                                            letterSpacing: "0.05em",
                                        }}
                                    >
                                        {event.agent}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: "0.65rem",
                                            color: "#475569",
                                            fontFamily: "monospace",
                                        }}
                                    >
                                        {new Date(event.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <p style={{ fontSize: "0.9rem", color: "#cbd5e1", marginTop: "0.125rem" }}>
                                    {event.message}
                                </p>
                            </div>
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {!isComplete && (
                        <div
                            style={{
                                display: "flex",
                                gap: "0.375rem",
                                padding: "1rem 1.5rem",
                            }}
                        >
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: "6px",
                                        height: "6px",
                                        borderRadius: "50%",
                                        background: "#6366f1",
                                        animation: `typing-dots 1.2s ease-in-out ${i * 0.2}s infinite`,
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Continue Button */}
            {isComplete && (
                <div className="animate-slide-up" style={{ marginTop: "1.5rem", textAlign: "center" }}>
                    <button
                        onClick={handleContinue}
                        className="btn-primary"
                        style={{ padding: "1rem 3rem", fontSize: "1.05rem" }}
                    >
                        🎯 Customize Your Trip
                    </button>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Mock Data Generators
// ============================================================================

function generateMockItinerary(input: { destination: string; startDate: string; endDate: string }) {
    return {
        id: `itin-${Date.now()}`,
        summary: `An amazing trip to ${input.destination}`,
        cities: [
            {
                cityName: input.destination.split(",")[0]?.trim() || input.destination,
                country: "India",
                arrivalDate: input.startDate,
                departureDate: input.endDate,
                days: [
                    {
                        dayNumber: 1,
                        date: input.startDate,
                        title: "Arrival & Exploration",
                        activities: [
                            { name: "Airport Arrival & Hotel Check-in", description: "Settle into your hotel", category: "sightseeing", startTime: "10:00", endTime: "12:00", estimatedCost: 0, location: { lat: 26.9124, lng: 75.7873 } },
                            { name: "Local Heritage Walk", description: "Explore the old city architecture", category: "culture", startTime: "14:00", endTime: "17:00", estimatedCost: 500, location: { lat: 26.9239, lng: 75.8267 } },
                            { name: "Rooftop Dinner", description: "Traditional cuisine with a view", category: "food", startTime: "19:00", endTime: "21:00", estimatedCost: 1500, location: { lat: 26.9196, lng: 75.7878 } },
                        ],
                    },
                    {
                        dayNumber: 2,
                        date: input.startDate,
                        title: "Culture & Discovery",
                        activities: [
                            { name: "Palace Visit", description: "Explore the royal heritage", category: "culture", startTime: "09:00", endTime: "12:00", estimatedCost: 200, location: { lat: 26.9260, lng: 75.8235 } },
                            { name: "Artisan Market", description: "Shop for local crafts", category: "shopping", startTime: "14:00", endTime: "16:00", estimatedCost: 2000, location: { lat: 26.9178, lng: 75.8179 } },
                            { name: "Sunset Point", description: "Watch the sunset over the city", category: "nature", startTime: "17:00", endTime: "19:00", estimatedCost: 0, location: { lat: 26.8851, lng: 75.8195 } },
                        ],
                    },
                ],
            },
        ],
        totalDays: 2,
        estimatedBudget: { flights: 8000, hotels: 12000, experiences: 5000, food: 3000, transport: 2000, total: 30000 },
    };
}

function generateMockFlights() {
    const airlines = [
        { code: "AI", name: "Air India", price: 4500 },
        { code: "6E", name: "IndiGo", price: 3800 },
        { code: "UK", name: "Vistara", price: 5200 },
        { code: "SG", name: "SpiceJet", price: 3200 },
        { code: "QP", name: "Akasa Air", price: 3500 },
    ];
    return airlines.map((a, i) => ({
        id: `flt-${i}`,
        airline: a.name,
        airlineLogo: `https://pics.avs.io/60/60/${a.code}.png`,
        flightNumber: `${a.code}${100 + i * 23}`,
        departure: { airport: "Delhi (DEL)", iataCode: "DEL", dateTime: `2025-04-01T${6 + i * 2}:00:00`, terminal: "T3" },
        arrival: { airport: "Jaipur (JAI)", iataCode: "JAI", dateTime: `2025-04-01T${7 + i * 2}:15:00`, terminal: "T1" },
        duration: "1h 15m",
        stops: i > 2 ? 1 : 0,
        price: a.price,
        currency: "INR",
        cabinClass: "Economy",
        seatsAvailable: 12 - i * 2,
        selected: false,
    }));
}

function generateMockHotels() {
    const hotels = [
        { name: "The Oberoi Rajvilas", stars: 5, ppn: 18000, rating: 4.9 },
        { name: "Taj Rambagh Palace", stars: 5, ppn: 15000, rating: 4.8 },
        { name: "ITC Rajputana", stars: 5, ppn: 8500, rating: 4.6 },
        { name: "Marriott Jaipur", stars: 4, ppn: 6000, rating: 4.4 },
        { name: "Radisson Blu", stars: 4, ppn: 4500, rating: 4.3 },
        { name: "Holiday Inn", stars: 3, ppn: 3500, rating: 4.0 },
        { name: "FabHotel Prime", stars: 3, ppn: 2000, rating: 3.8 },
        { name: "Zostel Jaipur", stars: 2, ppn: 800, rating: 4.2 },
    ];
    return hotels.map((h, i) => ({
        id: `htl-${i}`,
        name: h.name,
        address: `Jaipur City Center, Zone ${i + 1}`,
        city: "JAI",
        rating: h.rating,
        stars: h.stars,
        pricePerNight: h.ppn,
        totalPrice: h.ppn * 3,
        currency: "INR",
        amenities: ["WiFi", "Pool", "Gym", "Restaurant", "Spa"].slice(0, h.stars),
        location: { lat: 26.9124 + i * 0.008, lng: 75.7873 + i * 0.005 },
        checkIn: "2025-04-01",
        checkOut: "2025-04-04",
        roomType: h.stars >= 4 ? "Deluxe Room" : "Standard Room",
        selected: false,
    }));
}

function generateMockExperiences(destination: string) {
    const dest = destination.split(",")[0]?.trim() || destination;
    const exps = [
        { name: `${dest} Heritage Walking Tour`, cat: "culture", cost: 500, dur: "3 hours" },
        { name: "Street Food Safari", cat: "food", cost: 800, dur: "2.5 hours" },
        { name: "Royal Palace Tour", cat: "sightseeing", cost: 200, dur: "2 hours" },
        { name: "Sunset Camel Ride", cat: "adventure", cost: 1500, dur: "1.5 hours" },
        { name: "Block Printing Workshop", cat: "culture", cost: 1200, dur: "3 hours" },
        { name: "Bazaar Shopping Experience", cat: "shopping", cost: 0, dur: "2 hours" },
        { name: "Yoga at Dawn", cat: "wellness", cost: 600, dur: "1 hour" },
        { name: "Rooftop Cooking Class", cat: "food", cost: 2000, dur: "4 hours" },
        { name: "Step Well Photography Tour", cat: "sightseeing", cost: 300, dur: "2 hours" },
        { name: "Night Market & Music", cat: "nightlife", cost: 500, dur: "3 hours" },
    ];
    return exps.map((e, i) => ({
        id: `exp-${i}`,
        name: e.name,
        description: `Experience the best of ${dest} with this curated ${e.cat} activity.`,
        category: e.cat,
        location: { lat: 26.9124 + i * 0.005, lng: 75.7873 + i * 0.003 },
        rating: 4.0 + (i % 10) * 0.1,
        estimatedCost: e.cost,
        duration: e.dur,
        city: dest,
        selected: false,
    }));
}
