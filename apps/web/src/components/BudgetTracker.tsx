"use client";

/**
 * DRIFT — Budget Tracker Sidebar Component
 * Live updates as user selects flights, hotels, experiences.
 */

import { useTrip } from "@/lib/store";

export default function BudgetTracker() {
    const { state } = useTrip();
    const { budget } = state;
    const spentPercent = budget.total > 0 ? Math.min((budget.spent / budget.total) * 100, 100) : 0;
    const isOverBudget = budget.remaining < 0;

    const categories = [
        { label: "Flights", amount: budget.breakdown.flights, icon: "✈️", color: "#818cf8" },
        { label: "Hotels", amount: budget.breakdown.hotels, icon: "🏨", color: "#06b6d4" },
        { label: "Experiences", amount: budget.breakdown.experiences, icon: "🎯", color: "#10b981" },
    ];

    return (
        <div className="glass" style={{ borderRadius: "1rem", padding: "1.5rem" }}>
            {/* Header */}
            <h3 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                💰 Budget Tracker
            </h3>

            {/* Main Budget Display */}
            <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.25rem" }}>Remaining</div>
                <div
                    style={{
                        fontSize: "2rem",
                        fontWeight: 800,
                        color: isOverBudget ? "#ef4444" : "#10b981",
                        letterSpacing: "-0.02em",
                    }}
                >
                    ₹{Math.abs(budget.remaining).toLocaleString("en-IN")}
                </div>
                {isOverBudget && (
                    <div style={{ fontSize: "0.8rem", color: "#ef4444", fontWeight: 500 }}>Over budget!</div>
                )}
                <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>
                    of ₹{budget.total.toLocaleString("en-IN")}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="budget-bar" style={{ marginBottom: "1.25rem" }}>
                <div
                    className={`budget-bar-fill ${spentPercent > 80 ? "warning" : ""}`}
                    style={{ width: `${Math.min(spentPercent, 100)}%` }}
                />
            </div>

            {/* Breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {categories.map((cat) => (
                    <div key={cat.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span>{cat.icon}</span>
                            <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{cat.label}</span>
                        </div>
                        <span
                            style={{
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                color: cat.amount > 0 ? cat.color : "#475569",
                            }}
                        >
                            ₹{cat.amount.toLocaleString("en-IN")}
                        </span>
                    </div>
                ))}

                <div
                    style={{
                        borderTop: "1px solid rgba(100, 116, 139, 0.2)",
                        paddingTop: "0.75rem",
                        display: "flex",
                        justifyContent: "space-between",
                    }}
                >
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Total Spent</span>
                    <span style={{ fontWeight: 700, fontSize: "1rem", color: "#f1f5f9" }}>
                        ₹{budget.spent.toLocaleString("en-IN")}
                    </span>
                </div>
            </div>

            {/* Selected Counts */}
            <div
                style={{
                    marginTop: "1.25rem",
                    padding: "0.75rem",
                    borderRadius: "0.75rem",
                    background: "rgba(99, 102, 241, 0.06)",
                    display: "flex",
                    justifyContent: "space-around",
                    fontSize: "0.8rem",
                }}
            >
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#818cf8" }}>
                        {state.selectedFlights.length}
                    </div>
                    <div style={{ color: "#64748b" }}>Flights</div>
                </div>
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#06b6d4" }}>
                        {state.selectedHotels.length}
                    </div>
                    <div style={{ color: "#64748b" }}>Hotels</div>
                </div>
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#10b981" }}>
                        {state.selectedExperiences.length}
                    </div>
                    <div style={{ color: "#64748b" }}>Activities</div>
                </div>
            </div>
        </div>
    );
}
