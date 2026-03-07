"use client";

/**
 * DRIFT — Final Review Page
 * Screen 6: Summary of all selections before booking
 */

import { useRouter } from "next/navigation";
import { useTrip } from "@/lib/store";
import { useState } from "react";
import ExecutionScreen from "@/components/ExecutionScreen";

export default function ReviewPage() {
    const router = useRouter();
    const { state } = useTrip();
    const [isBooking, setIsBooking] = useState(false);

    if (!state.itinerary) {
        return (
            <div style={{ padding: "4rem", textAlign: "center" }}>
                <p style={{ color: "#94a3b8" }}>No trip to review.</p>
                <button className="btn-primary" onClick={() => router.push("/")} style={{ marginTop: "1rem" }}>
                    ← Start Over
                </button>
            </div>
        );
    }

    const handleBook = async () => {
        setIsBooking(true);
    };

    return (
        <>
            {isBooking && <ExecutionScreen />}
            <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1rem" }}>
                {/* Header */}
                <div className="animate-fade-in" style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <h1 className="gradient-text" style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                        Review Your Trip
                    </h1>
                    <p style={{ color: "#94a3b8" }}>
                        Confirm your selections before booking. Everything looks perfect? Let&apos;s go!
                    </p>
                </div>

                {/* Selections Summary */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {/* Flights */}
                    {state.selectedFlights.length > 0 && (
                        <div className="glass animate-slide-up" style={{ borderRadius: "1rem", padding: "1.5rem" }}>
                            <h2 style={{ fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                ✈️ Flights ({state.selectedFlights.length})
                            </h2>
                            {state.selectedFlights.map((flight) => {
                                const dep = flight.departure as Record<string, unknown>;
                                const arr = flight.arrival as Record<string, unknown>;
                                return (
                                    <div
                                        key={flight.id as string}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "0.75rem",
                                            borderRadius: "0.5rem",
                                            background: "rgba(99, 102, 241, 0.05)",
                                            marginBottom: "0.5rem",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                            <span style={{ fontWeight: 600 }}>{flight.airline as string}</span>
                                            <span style={{ color: "#64748b", fontSize: "0.85rem" }}>{flight.flightNumber as string}</span>
                                            <span style={{ color: "#94a3b8" }}>
                                                {dep?.iataCode as string} → {arr?.iataCode as string}
                                            </span>
                                        </div>
                                        <span style={{ fontWeight: 700, color: "#818cf8" }}>
                                            ₹{(flight.price as number)?.toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Hotels */}
                    {state.selectedHotels.length > 0 && (
                        <div className="glass animate-slide-up stagger-1" style={{ borderRadius: "1rem", padding: "1.5rem" }}>
                            <h2 style={{ fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                🏨 Hotels ({state.selectedHotels.length})
                            </h2>
                            {state.selectedHotels.map((hotel) => (
                                <div
                                    key={hotel.id as string}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "0.75rem",
                                        borderRadius: "0.5rem",
                                        background: "rgba(6, 182, 212, 0.05)",
                                        marginBottom: "0.5rem",
                                    }}
                                >
                                    <div>
                                        <span style={{ fontWeight: 600 }}>{hotel.name as string}</span>
                                        <span style={{ color: "#64748b", fontSize: "0.85rem", marginLeft: "0.75rem" }}>
                                            {"⭐".repeat(Math.min(hotel.stars as number, 5))}
                                        </span>
                                        <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                                            {hotel.checkIn as string} → {hotel.checkOut as string}
                                        </div>
                                    </div>
                                    <span style={{ fontWeight: 700, color: "#06b6d4" }}>
                                        ₹{(hotel.totalPrice as number)?.toLocaleString("en-IN")}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Experiences */}
                    {state.selectedExperiences.length > 0 && (
                        <div className="glass animate-slide-up stagger-2" style={{ borderRadius: "1rem", padding: "1.5rem" }}>
                            <h2 style={{ fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                🎯 Experiences ({state.selectedExperiences.length})
                            </h2>
                            {state.selectedExperiences.map((exp) => (
                                <div
                                    key={exp.id as string}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "0.75rem",
                                        borderRadius: "0.5rem",
                                        background: "rgba(16, 185, 129, 0.05)",
                                        marginBottom: "0.5rem",
                                    }}
                                >
                                    <div>
                                        <span style={{ fontWeight: 600 }}>{exp.name as string}</span>
                                        <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                                            {exp.duration as string} · {exp.category as string}
                                        </div>
                                    </div>
                                    <span style={{ fontWeight: 700, color: "#10b981" }}>
                                        {(exp.estimatedCost as number) > 0
                                            ? `₹${(exp.estimatedCost as number).toLocaleString("en-IN")}`
                                            : "Free"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Total */}
                    <div
                        className="glass animate-slide-up stagger-3"
                        style={{
                            borderRadius: "1rem",
                            padding: "1.5rem",
                            border: "1px solid rgba(99, 102, 241, 0.3)",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.25rem" }}>Total Cost</div>
                                <div style={{ fontSize: "2rem", fontWeight: 800 }}>
                                    ₹{state.budget.spent.toLocaleString("en-IN")}
                                </div>
                                <div style={{ fontSize: "0.85rem", color: state.budget.remaining >= 0 ? "#10b981" : "#ef4444" }}>
                                    {state.budget.remaining >= 0
                                        ? `₹${state.budget.remaining.toLocaleString("en-IN")} under budget ✓`
                                        : `₹${Math.abs(state.budget.remaining).toLocaleString("en-IN")} over budget ⚠️`}
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: "0.75rem" }}>
                                <button className="btn-secondary" onClick={() => router.push("/customize")}>
                                    ← Modify
                                </button>
                                <button
                                    className="btn-primary"
                                    onClick={handleBook}
                                    disabled={isBooking}
                                    style={{
                                        padding: "1rem 2.5rem",
                                        fontSize: "1.05rem",
                                        opacity: isBooking ? 0.7 : 1,
                                    }}
                                >
                                    {isBooking ? "🔄 Booking..." : "🎉 Confirm & Book"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
