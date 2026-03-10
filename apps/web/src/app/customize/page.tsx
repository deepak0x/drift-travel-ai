"use client";

/**
 * DRIFT — Trip Customization Page
 * Screen 3: 4-tab interface (Cities, Experiences, Hotels, Flights) + Budget Tracker + Chat
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTrip } from "@/lib/store";
import BudgetTracker from "@/components/budget-tracker";
import PlannerChat from "@/components/planner-chat";

type Tab = "cities" | "experiences" | "hotels" | "flights";

export default function CustomizePage() {
    const router = useRouter();
    const { state, dispatch } = useTrip();
    const [activeTab, setActiveTab] = useState<Tab>("flights");
    const [showChat, setShowChat] = useState(false);

    if (!state.itinerary) {
        return (
            <div style={{ padding: "4rem", textAlign: "center" }}>
                <p style={{ color: "#94a3b8" }}>No itinerary found. Please start from the beginning.</p>
                <button className="btn-primary" onClick={() => router.push("/")} style={{ marginTop: "1rem" }}>
                    ← Start Over
                </button>
            </div>
        );
    }

    const tabs: { key: Tab; label: string; icon: string; count: number }[] = [
        { key: "flights", label: "Flights", icon: "✈️", count: state.flights.length },
        { key: "hotels", label: "Hotels", icon: "🏨", count: state.hotels.length },
        { key: "experiences", label: "Experiences", icon: "🎯", count: state.experiences.length },
        { key: "cities", label: "Itinerary", icon: "📍", count: ((state.itinerary as Record<string, unknown>)?.cities as Array<unknown>)?.length || 0 },
    ];

    const handleProceed = () => {
        dispatch({ type: "SET_STEP", payload: "reviewing" });
        router.push("/review");
    };

    return (
        <div style={{ display: "flex", gap: "1.5rem", padding: "1.5rem", maxWidth: "1400px", margin: "0 auto" }}>
            {/* Main Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Page Header */}
                <div className="animate-fade-in" style={{ marginBottom: "1.5rem" }}>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                        Customize Your Trip
                    </h1>
                    <p style={{ color: "#94a3b8" }}>
                        Select your preferred flights, hotels, and experiences. Your budget updates in real-time.
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="tab-nav" style={{ marginBottom: "1.5rem" }}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            <span>{tab.icon}</span>{" "}
                            <span>{tab.label}</span>
                            <span style={{ marginLeft: "0.375rem", opacity: 0.7, fontSize: "0.8rem" }}>
                                ({tab.count})
                            </span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="animate-fade-in" key={activeTab}>
                    {activeTab === "flights" && <FlightsTab />}
                    {activeTab === "hotels" && <HotelsTab />}
                    {activeTab === "experiences" && <ExperiencesTab />}
                    {activeTab === "cities" && <ItineraryTab />}
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", justifyContent: "space-between" }}>
                    <button className="btn-secondary" onClick={() => setShowChat(!showChat)}>
                        💬 {showChat ? "Hide" : "Chat with"} Planner
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleProceed}
                        disabled={state.selectedFlights.length === 0 && state.selectedHotels.length === 0}
                        style={{
                            opacity: state.selectedFlights.length === 0 && state.selectedHotels.length === 0 ? 0.5 : 1,
                        }}
                    >
                        Review & Book →
                    </button>
                </div>

                {/* Chat */}
                {showChat && (
                    <div className="animate-slide-up" style={{ marginTop: "1.5rem" }}>
                        <PlannerChat />
                    </div>
                )}
            </div>

            {/* Budget Sidebar */}
            <div style={{ width: "320px", flexShrink: 0 }} className="hidden lg:block">
                <div style={{ position: "sticky", top: "80px" }}>
                    <BudgetTracker />
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Flights Tab
// ============================================================================

// Converts ISO 8601 duration like PT1H10M → "1h 10m"
function formatDuration(iso: string): string {
    if (!iso) return "";
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return iso;
    const h = match[1] ? `${match[1]}h` : "";
    const m = match[2] ? ` ${match[2]}m` : "";
    return (h + m).trim() || iso;
}

function FlightsTab() {
    const { state, dispatch } = useTrip();

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {state.flights.map((flight: Record<string, unknown>) => {
                const isSelected = state.selectedFlights.some((f) => f.id === flight.id);
                const dep = flight.departure as Record<string, unknown>;
                const arr = flight.arrival as Record<string, unknown>;
                const depCity = dep?.city ? String(dep.city) : "";
                const arrCity = arr?.city ? String(arr.city) : "";

                return (
                    <div
                        key={flight.id as string}
                        className={`card ${isSelected ? "selected" : ""}`}
                        onClick={() => dispatch({ type: "TOGGLE_FLIGHT", payload: flight })}
                        style={{ cursor: "pointer" }}
                    >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                {/* Airline */}
                                <div style={{ textAlign: "center", minWidth: "60px" }}>
                                    <div style={{ fontSize: "1.5rem" }}>✈️</div>
                                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.25rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                                        <span>{flight.airline as string}</span>
                                        {Boolean(flight.isNew) && (
                                            <span style={{ fontSize: "0.6rem", background: "#f59e0b", color: "#fff", padding: "0.1rem 0.3rem", borderRadius: "10px", fontWeight: 700 }}>
                                                NEW ✨
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Route */}
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                                                {(dep?.dateTime as string)?.slice(11, 16) || "06:00"}
                                            </div>
                                            <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{dep?.iataCode as string}</div>
                                            {depCity && <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{depCity}</div>}
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.125rem" }}>
                                            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                                                {(flight.durationText as string) || formatDuration(flight.duration as string)}
                                            </div>
                                            <div style={{ width: "80px", height: "2px", background: "linear-gradient(90deg, #6366f1, #06b6d4)", borderRadius: "1px" }} />
                                            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                                                {(flight.stops as number) === 0 ? "Direct" : `${flight.stops} stop`}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                                                {(arr?.dateTime as string)?.slice(11, 16) || "07:15"}
                                            </div>
                                            <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{arr?.iataCode as string}</div>
                                            {arrCity && <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{arrCity}</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Price */}
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: isSelected ? "#818cf8" : "#f1f5f9" }}>
                                    ₹{(flight.price as number)?.toLocaleString("en-IN")}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>per person</div>
                                {isSelected && (
                                    <div style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600, marginTop: "0.25rem" }}>
                                        ✓ Selected
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ============================================================================
// Hotels Tab
// ============================================================================

function HotelsTab() {
    const { state, dispatch } = useTrip();

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
            {state.hotels.map((hotel: Record<string, unknown>) => {
                const isSelected = state.selectedHotels.some((h) => h.id === hotel.id);
                const stars = hotel.stars as number;

                return (
                    <div
                        key={hotel.id as string}
                        className={`card ${isSelected ? "selected" : ""}`}
                        onClick={() => dispatch({ type: "TOGGLE_HOTEL", payload: hotel })}
                        style={{ cursor: "pointer" }}
                    >
                        {/* Hotel Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                            <div>
                                <h3 style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    {hotel.name as string}
                                    {Boolean(hotel.isNew) && (
                                        <span style={{ fontSize: "0.65rem", background: "#f59e0b", color: "#fff", padding: "0.1rem 0.4rem", borderRadius: "10px", fontWeight: 700 }}>
                                            NEW ✨
                                        </span>
                                    )}
                                </h3>
                                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                                    {"⭐".repeat(Math.min(stars, 5))}
                                    <span style={{ marginLeft: "0.5rem" }}>{hotel.rating as number}/5</span>
                                </div>
                            </div>
                            {isSelected && (
                                <div style={{ color: "#10b981", fontSize: "1.25rem" }}>✓</div>
                            )}
                        </div>

                        {/* Amenities */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "0.75rem" }}>
                            {((hotel.amenities as string[]) || []).map((a) => (
                                <span
                                    key={a}
                                    style={{
                                        padding: "0.2rem 0.5rem",
                                        borderRadius: "0.375rem",
                                        background: "rgba(99, 102, 241, 0.1)",
                                        color: "#818cf8",
                                        fontSize: "0.7rem",
                                    }}
                                >
                                    {a}
                                </span>
                            ))}
                        </div>

                        {/* Price */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                            <div>
                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{hotel.roomType as string}</div>
                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{hotel.address as string}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                                    ₹{(hotel.pricePerNight as number)?.toLocaleString("en-IN")}/night
                                </div>
                                <div style={{ fontSize: "1.15rem", fontWeight: 700, color: isSelected ? "#818cf8" : "#f1f5f9" }}>
                                    ₹{(hotel.totalPrice as number)?.toLocaleString("en-IN")}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ============================================================================
// Experiences Tab
// ============================================================================

function ExperiencesTab() {
    const { state, dispatch } = useTrip();

    const categoryIcons: Record<string, string> = {
        culture: "🏛️",
        food: "🍽️",
        sightseeing: "📸",
        adventure: "🏔️",
        shopping: "🛍️",
        nature: "🌿",
        wellness: "🧘",
        nightlife: "🌙",
    };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {state.experiences.map((exp: Record<string, unknown>) => {
                const isSelected = state.selectedExperiences.some((e) => e.id === exp.id);
                const cat = exp.category as string;

                return (
                    <div
                        key={exp.id as string}
                        className={`card ${isSelected ? "selected" : ""}`}
                        onClick={() => dispatch({ type: "TOGGLE_EXPERIENCE", payload: exp })}
                        style={{ cursor: "pointer" }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <span
                                style={{
                                    padding: "0.25rem 0.625rem",
                                    borderRadius: "9999px",
                                    background: "rgba(6, 182, 212, 0.1)",
                                    color: "#06b6d4",
                                    fontSize: "0.75rem",
                                    fontWeight: 500,
                                }}
                            >
                                {categoryIcons[cat] || "🎯"} {cat}
                            </span>
                            {isSelected && <span style={{ color: "#10b981" }}>✓</span>}
                        </div>

                        <h3 style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.375rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {exp.name as string}
                            {Boolean(exp.isNew) && (
                                <span style={{ fontSize: "0.65rem", background: "#f59e0b", color: "#fff", padding: "0.1rem 0.4rem", borderRadius: "10px", fontWeight: 700 }}>
                                    NEW ✨
                                </span>
                            )}
                        </h3>
                        <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.75rem", lineHeight: 1.4 }}>
                            {exp.description as string}
                        </p>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem", color: "#64748b" }}>
                                <span>⏱ {exp.duration as string}</span>
                                <span>⭐ {(exp.rating as number)?.toFixed(1)}</span>
                            </div>
                            <div style={{ fontWeight: 700, color: isSelected ? "#818cf8" : "#f1f5f9" }}>
                                {(exp.estimatedCost as number) > 0
                                    ? `₹${(exp.estimatedCost as number).toLocaleString("en-IN")}`
                                    : "Free"}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ============================================================================
// Itinerary Tab
// ============================================================================

function ItineraryTab() {
    const { state } = useTrip();
    const itinerary = state.itinerary as Record<string, unknown>;
    const cities = (itinerary?.cities as Array<Record<string, unknown>>) || [];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {cities.map((city, ci) => (
                <div key={ci} className="glass" style={{ borderRadius: "1rem", padding: "1.5rem" }}>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                        📍 {city.cityName as string}
                    </h2>
                    <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "1rem" }}>
                        {city.arrivalDate as string} → {city.departureDate as string}
                    </p>

                    {((city.days as Array<Record<string, unknown>>) || []).map((day, di) => (
                        <div key={di} style={{ marginBottom: "1rem" }}>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    marginBottom: "0.625rem",
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: "0.5rem",
                                    background: "rgba(99, 102, 241, 0.06)",
                                }}
                            >
                                <span
                                    style={{
                                        background: "var(--color-primary)",
                                        color: "white",
                                        width: "28px",
                                        height: "28px",
                                        borderRadius: "50%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "0.8rem",
                                        fontWeight: 700,
                                    }}
                                >
                                    {day.dayNumber as number}
                                </span>
                                <span style={{ fontWeight: 600 }}>{day.title as string}</span>
                            </div>

                            {((day.activities as Array<Record<string, unknown>>) || []).map((act, ai) => (
                                <div
                                    key={ai}
                                    style={{
                                        display: "flex",
                                        gap: "0.75rem",
                                        padding: "0.5rem 0.75rem",
                                        paddingLeft: "2.5rem",
                                        fontSize: "0.9rem",
                                    }}
                                >
                                    <span style={{ color: "#64748b", fontFamily: "monospace", fontSize: "0.8rem", minWidth: "90px" }}>
                                        {act.startTime as string} - {act.endTime as string}
                                    </span>
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{act.name as string}</div>
                                        <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{act.description as string}</div>
                                    </div>
                                    {(act.estimatedCost as number) > 0 && (
                                        <span style={{ marginLeft: "auto", color: "#818cf8", fontSize: "0.85rem", fontWeight: 500 }}>
                                            ₹{(act.estimatedCost as number).toLocaleString("en-IN")}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
