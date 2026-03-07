"use client";

/**
 * DRIFT — Execution Screen (Hackathon Demo)
 *
 * Full-screen dark overlay that appears during booking execution.
 * Shows animated 5-step progress with realistic status messages.
 * Confetti burst on completion → auto-redirect to dashboard.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTrip } from "@/lib/store";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExecutionEvent {
    step: number;
    stepLabel: string;
    stepIcon: string;
    status: "processing" | "done" | "error";
    message: string;
    data?: Record<string, unknown>;
    timestamp: string;
}

interface StepState {
    id: number;
    label: string;
    icon: string;
    status: "pending" | "processing" | "done" | "error";
    message: string;
    data?: Record<string, unknown>;
}

// ─── Mock Execution Events (offline mode) ────────────────────────────────────

const MOCK_EVENTS: Omit<ExecutionEvent, "timestamp">[] = [
    { step: 1, stepLabel: "Flight Booking", stepIcon: "✈️", status: "processing", message: "Contacting airline reservation systems..." },
    { step: 1, stepLabel: "Flight Booking", stepIcon: "✈️", status: "processing", message: "Confirming seat availability and fare lock..." },
    { step: 1, stepLabel: "Flight Booking", stepIcon: "✈️", status: "done", message: "✅ Flights confirmed!", data: { confirmations: [{ pnr: "XK7F9M", confirmationCode: "AI4R82NL", ticket: { airline: "Air India", flightNumber: "AI302", seat: "12A", class: "Economy" } }] } },
    { step: 2, stepLabel: "Hotel Reservation", stepIcon: "🏨", status: "processing", message: "Reserving your hotel rooms..." },
    { step: 2, stepLabel: "Hotel Reservation", stepIcon: "🏨", status: "processing", message: "Room assigned — Deluxe King, Floor 14 ✓" },
    { step: 2, stepLabel: "Hotel Reservation", stepIcon: "🏨", status: "done", message: "✅ Hotels reserved!", data: { confirmations: [{ reservationId: "HTL-AE4F-8c92ab31", hotel: { name: "ITC Rajputana" }, room: { type: "Deluxe King", roomNumber: "1408" } }] } },
    { step: 3, stepLabel: "Payment Processing", stepIcon: "💳", status: "processing", message: "Initializing secure payment gateway..." },
    { step: 3, stepLabel: "Payment Processing", stepIcon: "💳", status: "processing", message: "Processing ₹74,500 via Stripe..." },
    { step: 3, stepLabel: "Payment Processing", stepIcon: "💳", status: "processing", message: "Verifying transaction with bank..." },
    { step: 3, stepLabel: "Payment Processing", stepIcon: "💳", status: "done", message: "✅ Payment successful!", data: { payment: { paymentId: "pi_3R2x9kSI2f8D4vN0", status: "succeeded", amountFormatted: "₹74,500", method: { brand: "visa", last4: "4242" } } } },
    { step: 4, stepLabel: "Document Generation", stepIcon: "📄", status: "processing", message: "Generating your trip itinerary PDF..." },
    { step: 4, stepLabel: "Document Generation", stepIcon: "📄", status: "processing", message: "Creating QR codes for check-in..." },
    { step: 4, stepLabel: "Document Generation", stepIcon: "📄", status: "done", message: "✅ Trip documents and QR codes generated!", data: { documents: { pdf: { url: "#", pages: 6 }, qrCodes: [{ label: "Booking: DRIFT-AX72NF4Q", type: "booking" }] } } },
    { step: 5, stepLabel: "Saving Booking", stepIcon: "💾", status: "processing", message: "Saving booking to your account..." },
    { step: 5, stepLabel: "Saving Booking", stepIcon: "💾", status: "done", message: "✅ Trip booked! Redirecting to dashboard..." },
];

// ─── Confetti Particle ───────────────────────────────────────────────────────

function ConfettiCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const colors = ["#818cf8", "#6366f1", "#10b981", "#06b6d4", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6"];
        const particles: {
            x: number; y: number; vx: number; vy: number;
            w: number; h: number; color: string; rotation: number; spin: number;
            opacity: number; decay: number;
        }[] = [];

        // Create particles
        for (let i = 0; i < 150; i++) {
            particles.push({
                x: canvas.width / 2 + (Math.random() - 0.5) * 200,
                y: canvas.height / 2 - 100,
                vx: (Math.random() - 0.5) * 20,
                vy: -Math.random() * 18 - 5,
                w: Math.random() * 10 + 5,
                h: Math.random() * 6 + 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                spin: (Math.random() - 0.5) * 10,
                opacity: 1,
                decay: 0.005 + Math.random() * 0.01,
            });
        }

        let animFrame: number;

        function animate() {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            let alive = false;
            for (const p of particles) {
                if (p.opacity <= 0) continue;
                alive = true;

                p.x += p.vx;
                p.vy += 0.4; // gravity
                p.y += p.vy;
                p.rotation += p.spin;
                p.opacity -= p.decay;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.max(0, p.opacity);
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            }

            if (alive) {
                animFrame = requestAnimationFrame(animate);
            }
        }

        animate();
        return () => cancelAnimationFrame(animFrame);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "fixed",
                inset: 0,
                pointerEvents: "none",
                zIndex: 1000,
            }}
        />
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ExecutionScreen() {
    const router = useRouter();
    const { state, dispatch } = useTrip();
    const [steps, setSteps] = useState<StepState[]>([
        { id: 1, label: "Flight Booking", icon: "✈️", status: "pending", message: "Waiting..." },
        { id: 2, label: "Hotel Reservation", icon: "🏨", status: "pending", message: "Waiting..." },
        { id: 3, label: "Payment Processing", icon: "💳", status: "pending", message: "Waiting..." },
        { id: 4, label: "Document Generation", icon: "📄", status: "pending", message: "Waiting..." },
        { id: 5, label: "Saving Booking", icon: "💾", status: "pending", message: "Waiting..." },
    ]);
    const [isComplete, setIsComplete] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [bookingRef, setBookingRef] = useState("");
    const [bookingData, setBookingData] = useState<Record<string, unknown> | null>(null);

    // ─── Process event ─────────────────────────────────────────────────────────

    const processEvent = useCallback((event: ExecutionEvent) => {
        setSteps((prev) =>
            prev.map((step) => {
                if (step.id === event.step) {
                    return {
                        ...step,
                        status: event.status === "done" ? "done" : "processing",
                        message: event.message,
                        data: event.data,
                    };
                }
                return step;
            })
        );

        // Capture final booking data
        if (event.step === 5 && event.status === "done") {
            const booking = event.data?.booking as Record<string, unknown> | undefined;
            if (booking) {
                setBookingData(booking);
                setBookingRef((booking.bookingRef as string) || "");
            }
        }
    }, []);

    // ─── Start execution ──────────────────────────────────────────────────────

    useEffect(() => {
        let cancelled = false;

        async function runExecution() {
            // Try real API first
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            if (apiUrl && state.tripId) {
                try {
                    const resp = await fetch(`${apiUrl}/execute/stream`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            tripId: state.tripId,
                            userId: "anonymous",
                            flights: { items: state.selectedFlights },
                            hotels: state.selectedHotels.map((h) => ({
                                ...h,
                                hotel: h,
                                city: (h as Record<string, unknown>).city || "",
                            })),
                            experiences: state.selectedExperiences,
                            totalCost: state.budget.spent,
                            currency: "INR",
                        }),
                    });

                    if (resp.ok) {
                        const text = await resp.text();
                        const lines = text.split("\n").filter(Boolean);
                        for (const line of lines) {
                            if (cancelled) return;
                            try {
                                const event = JSON.parse(line) as ExecutionEvent;
                                processEvent(event);
                                await new Promise((r) => setTimeout(r, 300));
                            } catch {
                                // skip malformed lines
                            }
                        }
                    }
                } catch {
                    // Fall through to mock
                }
            }

            // Mock execution (offline / demo mode)
            for (let i = 0; i < MOCK_EVENTS.length; i++) {
                if (cancelled) return;

                const event: ExecutionEvent = {
                    ...MOCK_EVENTS[i],
                    timestamp: new Date().toISOString(),
                };
                processEvent(event);

                // Varied timing for realism
                const delay = event.status === "done" ? 500 : 800 + Math.random() * 700;
                await new Promise((r) => setTimeout(r, delay));
            }

            // Mark complete
            if (!cancelled) {
                setIsComplete(true);
                setShowConfetti(true);

                if (!bookingRef) {
                    setBookingRef(
                        `DRIFT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
                    );
                }
            }
        }

        runExecution();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Auto-redirect after completion ────────────────────────────────────────

    useEffect(() => {
        if (!isComplete) return;

        const timer = setTimeout(() => {
            // Save booking to state
            dispatch({
                type: "SET_BOOKING",
                payload: bookingData || {
                    id: `booking-${Date.now()}`,
                    bookingRef: bookingRef || "DRIFT-DEMO1234",
                    tripId: state.tripId,
                    status: "confirmed",
                    totalCost: state.budget.spent,
                    currency: "INR",
                },
            });
            dispatch({ type: "SET_STEP", payload: "booked" });
            router.push("/dashboard");
        }, 3000);

        return () => clearTimeout(timer);
    }, [isComplete, bookingRef, bookingData, dispatch, router, state.tripId, state.budget.spent]);

    // ─── Render ────────────────────────────────────────────────────────────────

    const activeStep = steps.find((s) => s.status === "processing");
    const completedCount = steps.filter((s) => s.status === "done").length;
    const progress = (completedCount / steps.length) * 100;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 100,
                background: "rgba(2, 6, 23, 0.95)",
                backdropFilter: "blur(20px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {showConfetti && <ConfettiCanvas />}

            <div
                className="animate-fade-in"
                style={{
                    width: "100%",
                    maxWidth: "560px",
                    padding: "2rem",
                }}
            >
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
                    <div
                        className="animate-float"
                        style={{ fontSize: "3rem", marginBottom: "0.75rem" }}
                    >
                        {isComplete ? "🎉" : activeStep?.icon || "⏳"}
                    </div>
                    <h1
                        className="gradient-text"
                        style={{
                            fontSize: "1.75rem",
                            fontWeight: 800,
                            marginBottom: "0.5rem",
                            letterSpacing: "-0.02em",
                        }}
                    >
                        {isComplete ? "Trip Booked!" : "Booking Your Trip..."}
                    </h1>
                    {isComplete && bookingRef && (
                        <p style={{ color: "#818cf8", fontWeight: 600, fontSize: "1.1rem" }}>
                            Ref: {bookingRef}
                        </p>
                    )}
                    {!isComplete && (
                        <p style={{ color: "#94a3b8", fontSize: "0.95rem" }}>
                            {activeStep?.message || "Preparing..."}
                        </p>
                    )}
                </div>

                {/* Progress Bar */}
                <div
                    style={{
                        height: "4px",
                        borderRadius: "2px",
                        background: "rgba(100, 116, 139, 0.2)",
                        marginBottom: "2rem",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            height: "100%",
                            width: `${progress}%`,
                            background: isComplete
                                ? "linear-gradient(90deg, #10b981, #06b6d4)"
                                : "linear-gradient(90deg, #6366f1, #818cf8)",
                            borderRadius: "2px",
                            transition: "width 0.5s ease",
                        }}
                    />
                </div>

                {/* Steps */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {steps.map((step) => (
                        <div
                            key={step.id}
                            className={step.status === "processing" ? "animate-fade-in" : ""}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "1rem",
                                padding: "0.875rem 1.25rem",
                                borderRadius: "0.875rem",
                                background:
                                    step.status === "processing"
                                        ? "rgba(99, 102, 241, 0.08)"
                                        : step.status === "done"
                                            ? "rgba(16, 185, 129, 0.06)"
                                            : "rgba(15, 23, 42, 0.4)",
                                border:
                                    step.status === "processing"
                                        ? "1px solid rgba(99, 102, 241, 0.2)"
                                        : step.status === "done"
                                            ? "1px solid rgba(16, 185, 129, 0.15)"
                                            : "1px solid rgba(51, 65, 85, 0.3)",
                                transition: "all 0.4s ease",
                            }}
                        >
                            {/* Step Icon / Status */}
                            <div
                                style={{
                                    width: "40px",
                                    height: "40px",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "1.1rem",
                                    background:
                                        step.status === "done"
                                            ? "rgba(16, 185, 129, 0.15)"
                                            : step.status === "processing"
                                                ? "rgba(99, 102, 241, 0.15)"
                                                : "rgba(51, 65, 85, 0.3)",
                                    flexShrink: 0,
                                }}
                            >
                                {step.status === "done" ? (
                                    <span style={{ color: "#10b981", fontSize: "1.2rem" }}>✓</span>
                                ) : step.status === "processing" ? (
                                    <span
                                        style={{
                                            display: "inline-block",
                                            animation: "spin 1s linear infinite",
                                        }}
                                    >
                                        {step.icon}
                                    </span>
                                ) : (
                                    <span style={{ opacity: 0.4 }}>{step.icon}</span>
                                )}
                            </div>

                            {/* Step Label & Message */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                    style={{
                                        fontWeight: 600,
                                        fontSize: "0.95rem",
                                        color:
                                            step.status === "done"
                                                ? "#10b981"
                                                : step.status === "processing"
                                                    ? "#f1f5f9"
                                                    : "#64748b",
                                        marginBottom: "0.125rem",
                                    }}
                                >
                                    {step.label}
                                </div>
                                <div
                                    style={{
                                        fontSize: "0.8rem",
                                        color:
                                            step.status === "processing"
                                                ? "#94a3b8"
                                                : step.status === "done"
                                                    ? "#4ade80"
                                                    : "#475569",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {step.message}
                                </div>

                                {/* Show booking details for completed steps */}
                                {step.status === "done" && step.data && step.id === 1 && (
                                    <div style={{ marginTop: "0.375rem", fontSize: "0.75rem", color: "#818cf8" }}>
                                        {(() => {
                                            const confirmations = (step.data.confirmations as Record<string, unknown>[]) || [];
                                            const first = confirmations[0];
                                            if (!first) return null;
                                            const ticket = first.ticket as Record<string, unknown> | undefined;
                                            return `PNR: ${first.pnr} · Seat ${ticket?.seat} · ${ticket?.airline}`;
                                        })()}
                                    </div>
                                )}
                                {step.status === "done" && step.data && step.id === 3 && (
                                    <div style={{ marginTop: "0.375rem", fontSize: "0.75rem", color: "#10b981" }}>
                                        {(() => {
                                            const payment = step.data.payment as Record<string, unknown> | undefined;
                                            if (!payment) return null;
                                            const method = payment.method as Record<string, unknown> | undefined;
                                            return `${payment.amountFormatted} · ${method?.brand} ****${method?.last4}`;
                                        })()}
                                    </div>
                                )}
                            </div>

                            {/* Spinner for processing */}
                            {step.status === "processing" && (
                                <div
                                    style={{
                                        width: "18px",
                                        height: "18px",
                                        border: "2px solid rgba(99, 102, 241, 0.2)",
                                        borderTopColor: "#818cf8",
                                        borderRadius: "50%",
                                        animation: "spin 0.8s linear infinite",
                                        flexShrink: 0,
                                    }}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Completion Footer */}
                {isComplete && (
                    <div
                        className="animate-slide-up"
                        style={{
                            textAlign: "center",
                            marginTop: "2rem",
                            padding: "1.25rem",
                            borderRadius: "1rem",
                            background: "rgba(16, 185, 129, 0.08)",
                            border: "1px solid rgba(16, 185, 129, 0.2)",
                        }}
                    >
                        <p style={{ color: "#10b981", fontWeight: 600, fontSize: "1rem", marginBottom: "0.25rem" }}>
                            Everything is confirmed! 🎊
                        </p>
                        <p style={{ color: "#64748b", fontSize: "0.85rem" }}>
                            Redirecting to your trip dashboard...
                        </p>
                    </div>
                )}
            </div>

            {/* CSS Animations (scoped) */}
            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
