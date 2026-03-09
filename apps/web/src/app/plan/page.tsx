"use client";

/**
 * DRIFT — Plan Page / Agent Thinking Box
 * Screen 2: Calls real backend APIs and streams live agent status
 */

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTrip } from "@/lib/store";
import type { AgentEvent } from "@/lib/store";
import { planTrip, retrieveWithStreaming } from "@/lib/api";

export default function PlanPage() {
    const router = useRouter();
    const { state, dispatch } = useTrip();
    const [events, setEvents] = useState<AgentEvent[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasStarted = useRef(false);

    const addEvent = (event: Omit<AgentEvent, "id" | "timestamp">) => {
        const fullEvent: AgentEvent = {
            ...event,
            id: `evt-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toISOString(),
        };
        setEvents((prev) => [...prev, fullEvent]);
        dispatch({ type: "ADD_AGENT_EVENT", payload: fullEvent });
        return fullEvent;
    };

    useEffect(() => {
        if (!state.input) {
            router.push("/");
            return;
        }
        if (hasStarted.current) return;
        hasStarted.current = true;

        const run = async () => {
            try {
                // ── Step 1: Plan the itinerary ─────────────────────────────
                addEvent({ type: "thinking", agent: "planner", message: `Understanding your trip to ${state.input!.destination}...` });
                addEvent({ type: "thinking", agent: "planner", message: "Analyzing destination, weather, festivals, and local events..." });

                const planResult = await planTrip({
                    destination: state.input!.destination,
                    startDate: state.input!.startDate,
                    endDate: state.input!.endDate,
                    travelers: state.input!.travelers,
                    budget: state.input!.budget,
                    currency: state.input!.currency || "INR",
                    theme: state.input!.theme || "cultural",
                    activityLevel: state.input!.activityLevel || "moderate",
                    specialRequests: state.input!.specialRequests,
                });

                if (!planResult.success || !planResult.data) {
                    throw new Error(planResult.error || "Itinerary generation failed");
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const itinerary = planResult.data as any;
                dispatch({ type: "SET_ITINERARY", payload: itinerary });
                dispatch({ type: "SET_TRIP_ID", payload: itinerary.id || `trip-${Date.now()}` });
                addEvent({ type: "found", agent: "planner", message: `✓ Itinerary ready for ${state.input!.destination}` });

                // ── Step 2: Retrieve flights, hotels & experiences ─────────
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const cities = (itinerary.cities as any[]) || [];
                if (cities.length === 0) throw new Error("No cities in itinerary");

                addEvent({ type: "thinking", agent: "retriever", message: "Searching live travel data from Amadeus & Foursquare..." });

                let finalData: { flights: unknown[]; hotels: unknown[]; experiences: unknown[] } | null = null;

                await retrieveWithStreaming(
                    {
                        cities,
                        startDate: state.input!.startDate,
                        endDate: state.input!.endDate,
                        travelers: state.input!.travelers,
                        budget: state.input!.budget,
                        currency: state.input!.currency || "INR",
                    },
                    (event) => {
                        setEvents((prev) => [...prev, { ...event, id: event.id || `evt-${Date.now()}` }]);
                        dispatch({ type: "ADD_AGENT_EVENT", payload: event });

                        if (event.type === "complete" && event.data) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            finalData = event.data as any;
                        }
                    }
                );

                if (finalData) {
                    dispatch({
                        type: "SET_OPTIONS",
                        payload: {
                            flights: ((finalData as { flights: unknown[] }).flights || []) as Record<string, unknown>[],
                            hotels: ((finalData as { hotels: unknown[] }).hotels || []) as Record<string, unknown>[],
                            experiences: ((finalData as { experiences: unknown[] }).experiences || []) as Record<string, unknown>[],
                        },
                    });
                }

                setIsComplete(true);
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Something went wrong";
                setError(msg);
                addEvent({ type: "error", agent: "planner", message: `❌ ${msg}` });
            }
        };

        run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        <div style={{ minHeight: "calc(100vh - 60px)", padding: "2rem 1rem", maxWidth: "800px", margin: "0 auto" }}>
            {/* Title */}
            <div className="animate-fade-in" style={{ textAlign: "center", marginBottom: "2rem" }}>
                <h1 className="gradient-text" style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                    {isComplete ? "Your trip is ready! 🎉" : error ? "Something went wrong" : "AI Agents at work..."}
                </h1>
                <p style={{ color: "#94a3b8" }}>
                    {isComplete
                        ? `Perfect itinerary for ${state.input?.destination}`
                        : error
                            ? error
                            : `Planning your trip to ${state.input?.destination || "..."}`}
                </p>
            </div>

            {/* Thinking Box */}
            <div className="glass" style={{ borderRadius: "1.25rem", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(99, 102, 241, 0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div
                            style={{
                                width: "10px", height: "10px", borderRadius: "50%",
                                background: error ? "#ef4444" : isComplete ? "#10b981" : "#6366f1",
                                boxShadow: isComplete ? "0 0 10px rgba(16, 185, 129, 0.5)" : "0 0 10px rgba(99, 102, 241, 0.5)",
                            }}
                            className={isComplete || error ? "" : "animate-pulse-glow"}
                        />
                        <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Agent Activity</span>
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{events.length} steps</span>
                </div>

                {/* Events Stream */}
                <div ref={scrollRef} style={{ maxHeight: "450px", overflowY: "auto", padding: "0.5rem" }}>
                    {events.map((event, i) => (
                        <div
                            key={event.id}
                            className={`thinking-step ${i === events.length - 1 && !isComplete ? "active" : ""}`}
                            style={{ animationDelay: `${i * 0.05}s` }}
                        >
                            <div className={`thinking-dot ${event.type}`} />
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span style={{
                                        fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase",
                                        color: event.agent === "planner" ? "#818cf8" : event.agent === "retriever" ? "#06b6d4" : "#10b981",
                                        letterSpacing: "0.05em",
                                    }}>
                                        {event.agent}
                                    </span>
                                    <span style={{ fontSize: "0.65rem", color: "#475569", fontFamily: "monospace" }}>
                                        {new Date(event.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <p style={{ fontSize: "0.9rem", color: "#cbd5e1", marginTop: "0.125rem" }}>{event.message}</p>
                            </div>
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {!isComplete && !error && (
                        <div style={{ display: "flex", gap: "0.375rem", padding: "1rem 1.5rem" }}>
                            {[0, 1, 2].map((i) => (
                                <div key={i} style={{
                                    width: "6px", height: "6px", borderRadius: "50%", background: "#6366f1",
                                    animation: `typing-dots 1.2s ease-in-out ${i * 0.2}s infinite`,
                                }} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Button */}
            {(isComplete || error) && (
                <div className="animate-slide-up" style={{ marginTop: "1.5rem", textAlign: "center", display: "flex", gap: "1rem", justifyContent: "center" }}>
                    {error && (
                        <button onClick={() => router.push("/")} className="btn-secondary">
                            ← Try Again
                        </button>
                    )}
                    <button onClick={handleContinue} className="btn-primary" style={{ padding: "1rem 3rem", fontSize: "1.05rem" }}>
                        🎯 Customize Your Trip
                    </button>
                </div>
            )}
        </div>
    );
}
