"use client";

import Link from "next/link";
import { useTrip } from "@/lib/store";

export default function Header() {
    const { state } = useTrip();

    const steps = [
        { key: "input", label: "Plan", icon: "✨" },
        { key: "planning", label: "Thinking", icon: "🧠" },
        { key: "customizing", label: "Customize", icon: "🎯" },
        { key: "reviewing", label: "Review", icon: "📋" },
        { key: "booked", label: "Booked", icon: "🎉" },
    ];

    const currentIdx = steps.findIndex((s) => s.key === state.currentStep);

    return (
        <header className="glass" style={{ position: "sticky", top: 0, zIndex: 50 }}>
            <div
                style={{
                    maxWidth: "1280px",
                    margin: "0 auto",
                    padding: "0.75rem 1.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                {/* Logo */}
                <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.75rem" }}>✈️</span>
                    <span
                        className="gradient-text"
                        style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}
                    >
                        DRIFT
                    </span>
                </Link>

                {/* Step Indicator */}
                {state.currentStep !== "input" && (
                    <nav
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                        }}
                    >
                        {steps.map((step, idx) => (
                            <div
                                key={step.key}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.375rem",
                                        padding: "0.375rem 0.75rem",
                                        borderRadius: "9999px",
                                        fontSize: "0.8rem",
                                        fontWeight: idx <= currentIdx ? 600 : 400,
                                        background:
                                            idx === currentIdx
                                                ? "rgba(99, 102, 241, 0.2)"
                                                : idx < currentIdx
                                                    ? "rgba(16, 185, 129, 0.1)"
                                                    : "transparent",
                                        color:
                                            idx === currentIdx
                                                ? "#818cf8"
                                                : idx < currentIdx
                                                    ? "#10b981"
                                                    : "#64748b",
                                        border:
                                            idx === currentIdx
                                                ? "1px solid rgba(99, 102, 241, 0.3)"
                                                : "1px solid transparent",
                                        transition: "all 0.3s ease",
                                    }}
                                >
                                    <span>{step.icon}</span>
                                    <span className="hidden sm:inline">{step.label}</span>
                                </div>
                                {idx < steps.length - 1 && (
                                    <div
                                        style={{
                                            width: "20px",
                                            height: "2px",
                                            background:
                                                idx < currentIdx
                                                    ? "#10b981"
                                                    : "rgba(100, 116, 139, 0.3)",
                                            borderRadius: "1px",
                                            transition: "background 0.3s ease",
                                        }}
                                    />
                                )}
                            </div>
                        ))}
                    </nav>
                )}

                {/* Budget Badge */}
                {state.budget.total > 0 && state.currentStep !== "input" && (
                    <div
                        className="glass-light"
                        style={{
                            padding: "0.375rem 0.875rem",
                            borderRadius: "9999px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                        }}
                    >
                        <span style={{ color: "#94a3b8" }}>Budget: </span>
                        <span
                            style={{
                                color:
                                    state.budget.remaining >= 0 ? "#10b981" : "#ef4444",
                            }}
                        >
                            ₹{state.budget.remaining.toLocaleString("en-IN")}
                        </span>
                        <span style={{ color: "#64748b" }}>
                            {" "}/ ₹{state.budget.total.toLocaleString("en-IN")}
                        </span>
                    </div>
                )}
            </div>
        </header>
    );
}
