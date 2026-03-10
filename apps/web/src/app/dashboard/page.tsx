"use client";

/**
 * DRIFT — Trip Dashboard
 * Screen 7: Post-booking view with tickets, day-wise itinerary, map placeholder, QR codes.
 */

import { useRouter } from "next/navigation";
import { useTrip } from "@/lib/store";

export default function DashboardPage() {
    const router = useRouter();
    const { state, dispatch } = useTrip();
    const booking = state.booking as Record<string, unknown> | null;

    if (!booking) {
        return (
            <div style={{ padding: "4rem", textAlign: "center" }}>
                <p style={{ color: "#94a3b8" }}>No booking found.</p>
                <button className="btn-primary" onClick={() => router.push("/")} style={{ marginTop: "1rem" }}>
                    ← Plan a Trip
                </button>
            </div>
        );
    }

    const itinerary = state.itinerary as Record<string, unknown>;
    const cities = (itinerary?.cities as Array<Record<string, unknown>>) || [];

    return (
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1rem" }}>
            {/* Success Banner */}
            <div
                className="animate-fade-in"
                style={{
                    textAlign: "center",
                    marginBottom: "2rem",
                    padding: "2rem",
                    borderRadius: "1.5rem",
                    background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(99, 102, 241, 0.1))",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                }}
            >
                <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎉</div>
                <h1 className="gradient-text" style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                    Trip Booked Successfully!
                </h1>
                <p style={{ color: "#94a3b8", fontSize: "1rem" }}>
                    Booking Reference: <strong style={{ color: "#818cf8" }}>{booking.bookingRef as string}</strong>
                </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem" }}>
                {/* Left Column — Itinerary + Tickets */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {/* Flight Tickets */}
                    {state.selectedFlights.length > 0 && (
                        <div className="glass animate-slide-up" style={{ borderRadius: "1rem", overflow: "hidden" }}>
                            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(99, 102, 241, 0.1)" }}>
                                <h2 style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    ✈️ Flight Tickets
                                </h2>
                            </div>
                            {state.selectedFlights.map((flight) => {
                                const dep = flight.departure as Record<string, unknown>;
                                const arr = flight.arrival as Record<string, unknown>;
                                return (
                                    <div
                                        key={flight.id as string}
                                        style={{
                                            padding: "1.25rem 1.5rem",
                                            borderBottom: "1px dashed rgba(100, 116, 139, 0.2)",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.25rem" }}>
                                                {flight.airline as string} · {flight.flightNumber as string}
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#94a3b8", fontSize: "0.9rem" }}>
                                                <span>{dep?.iataCode as string}</span>
                                                <span style={{ color: "#6366f1" }}>→</span>
                                                <span>{arr?.iataCode as string}</span>
                                                <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: "#64748b" }}>
                                                    {flight.duration as string}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>
                                                {(dep?.dateTime as string)?.slice(0, 10)} · Terminal {dep?.terminal as string}
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                padding: "0.5rem 1rem",
                                                borderRadius: "0.5rem",
                                                background: "rgba(16, 185, 129, 0.1)",
                                                color: "#10b981",
                                                fontWeight: 600,
                                                fontSize: "0.85rem",
                                            }}
                                        >
                                            Confirmed ✓
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Hotel Bookings */}
                    {state.selectedHotels.length > 0 && (
                        <div className="glass animate-slide-up stagger-1" style={{ borderRadius: "1rem", overflow: "hidden" }}>
                            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(99, 102, 241, 0.1)" }}>
                                <h2 style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    🏨 Hotel Reservations
                                </h2>
                            </div>
                            {state.selectedHotels.map((hotel) => (
                                <div
                                    key={hotel.id as string}
                                    style={{
                                        padding: "1.25rem 1.5rem",
                                        borderBottom: "1px dashed rgba(100, 116, 139, 0.2)",
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{hotel.name as string}</div>
                                            <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.125rem" }}>
                                                {"⭐".repeat(Math.min(hotel.stars as number, 5))} · {hotel.roomType as string}
                                            </div>
                                            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>
                                                Check-in: {hotel.checkIn as string} · Check-out: {hotel.checkOut as string}
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                padding: "0.5rem 1rem",
                                                borderRadius: "0.5rem",
                                                background: "rgba(16, 185, 129, 0.1)",
                                                color: "#10b981",
                                                fontWeight: 600,
                                                fontSize: "0.85rem",
                                            }}
                                        >
                                            Confirmed ✓
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Day-wise Itinerary */}
                    <div className="glass animate-slide-up stagger-2" style={{ borderRadius: "1rem", overflow: "hidden" }}>
                        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(99, 102, 241, 0.1)" }}>
                            <h2 style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                📅 Day-by-Day Itinerary
                            </h2>
                        </div>
                        <div style={{ padding: "1rem 1.5rem" }}>
                            {cities.map((city, ci) => (
                                <div key={ci} style={{ marginBottom: "1.5rem" }}>
                                    <h3 style={{ fontWeight: 600, color: "#818cf8", marginBottom: "0.75rem" }}>
                                        📍 {city.cityName as string}
                                    </h3>
                                    {((city.days as Array<Record<string, unknown>>) || []).map((day, di) => (
                                        <div key={di} style={{ marginBottom: "1rem", paddingLeft: "0.75rem", borderLeft: "2px solid rgba(99, 102, 241, 0.2)" }}>
                                            <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.95rem" }}>
                                                Day {day.dayNumber as number}: {day.title as string}
                                            </div>
                                            {((day.activities as Array<Record<string, unknown>>) || []).map((act, ai) => (
                                                <div
                                                    key={ai}
                                                    style={{
                                                        display: "flex",
                                                        gap: "0.75rem",
                                                        padding: "0.375rem 0",
                                                        fontSize: "0.85rem",
                                                    }}
                                                >
                                                    <span style={{ color: "#64748b", fontFamily: "monospace", minWidth: "85px", fontSize: "0.8rem" }}>
                                                        {act.startTime as string}-{act.endTime as string}
                                                    </span>
                                                    <span>{act.name as string}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column — Map, QR, Quick Info */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>


                    {/* QR Codes */}
                    <div className="glass animate-slide-up stagger-1" style={{ borderRadius: "1rem", padding: "1.5rem" }}>
                        <h3 style={{ fontWeight: 600, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            📱 QR Codes
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {/* Booking QR */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "1rem",
                                    padding: "0.75rem",
                                    borderRadius: "0.75rem",
                                    background: "rgba(99, 102, 241, 0.06)",
                                }}
                            >
                                <div
                                    style={{
                                        width: "60px",
                                        height: "60px",
                                        borderRadius: "0.5rem",
                                        background: "white",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "2rem",
                                    }}
                                >
                                    📱
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Booking QR</div>
                                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{booking.bookingRef as string}</div>
                                </div>
                            </div>

                            {/* Flight QRs */}
                            {state.selectedFlights.map((fl) => (
                                <div
                                    key={fl.id as string}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "1rem",
                                        padding: "0.75rem",
                                        borderRadius: "0.75rem",
                                        background: "rgba(99, 102, 241, 0.04)",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "60px",
                                            height: "60px",
                                            borderRadius: "0.5rem",
                                            background: "white",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "1.5rem",
                                        }}
                                    >
                                        ✈️
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{fl.flightNumber as string}</div>
                                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{fl.airline as string}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Trip Summary */}
                    <div className="glass animate-slide-up stagger-2" style={{ borderRadius: "1rem", padding: "1.5rem" }}>
                        <h3 style={{ fontWeight: 600, marginBottom: "0.75rem" }}>📊 Trip Summary</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", fontSize: "0.9rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#94a3b8" }}>Destination</span>
                                <span style={{ fontWeight: 500 }}>{state.input?.destination}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#94a3b8" }}>Dates</span>
                                <span style={{ fontWeight: 500 }}>{state.input?.startDate} → {state.input?.endDate}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#94a3b8" }}>Travelers</span>
                                <span style={{ fontWeight: 500 }}>{state.input?.travelers}</span>
                            </div>
                            <div
                                style={{
                                    borderTop: "1px solid rgba(100, 116, 139, 0.2)",
                                    paddingTop: "0.625rem",
                                    display: "flex",
                                    justifyContent: "space-between",
                                }}
                            >
                                <span style={{ fontWeight: 600 }}>Total Paid</span>
                                <span style={{ fontWeight: 700, color: "#10b981", fontSize: "1.1rem" }}>
                                    ₹{state.budget.spent.toLocaleString("en-IN")}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* New Trip Button */}
                    <button
                        className="btn-secondary"
                        onClick={() => {
                            dispatch({ type: "RESET" });
                            router.push("/");
                        }}
                        style={{ width: "100%" }}
                    >
                        ✨ Plan Another Trip
                    </button>
                </div>
            </div>
        </div>
    );
}
