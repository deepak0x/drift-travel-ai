"use client";

/**
 * DRIFT — Planner Chat Component
 * Interactive AI chat connected to the real Planner Agent.
 * Supports action-based responses: update days, suggest hotels/flights/experiences.
 */

import { useState, useRef, useEffect } from "react";
import { useTrip } from "@/lib/store";
import type { ChatMessage } from "@/lib/store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatAction {
    type: "update_day" | "suggest_hotels" | "suggest_flights" | "suggest_experiences" | "budget_tip" | "info";
    dayNumber?: number;
    cityName?: string;
    newTitle?: string;
    newActivities?: Array<{
        name: string;
        description: string;
        category: string;
        startTime: string;
        endTime: string;
        estimatedCost: number;
    }>;
    suggestions?: Array<Record<string, unknown>>;
    tip?: string;
    savings?: number;
}

// ─── Action Card Renderer ─────────────────────────────────────────────────────

function ActionCard({ action, onApply }: { action: ChatAction; onApply: () => void }) {
    const [applied, setApplied] = useState(false);

    const handleApply = () => {
        setApplied(true);
        onApply();
    };

    if (action.type === "update_day") {
        return (
            <div style={{
                marginTop: "0.5rem",
                padding: "0.75rem",
                borderRadius: "0.75rem",
                background: "rgba(99, 102, 241, 0.08)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                fontSize: "0.82rem",
            }}>
                <div style={{ fontWeight: 600, color: "#818cf8", marginBottom: "0.25rem" }}>
                    📅 Day {action.dayNumber} — {action.newTitle}
                </div>
                {action.newActivities?.slice(0, 3).map((a, i) => (
                    <div key={i} style={{ color: "#94a3b8", marginBottom: "0.125rem" }}>
                        • {a.startTime} {a.name} {a.estimatedCost > 0 ? `(₹${a.estimatedCost})` : "(free)"}
                    </div>
                ))}
                {!applied ? (
                    <button
                        onClick={handleApply}
                        style={{
                            marginTop: "0.5rem",
                            padding: "0.3rem 0.75rem",
                            borderRadius: "0.5rem",
                            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                            border: "none",
                            color: "white",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        ✓ Apply changes
                    </button>
                ) : (
                    <span style={{ color: "#10b981", fontSize: "0.78rem", marginTop: "0.25rem", display: "block" }}>
                        ✅ Applied!
                    </span>
                )}
            </div>
        );
    }

    if (action.type === "suggest_hotels") {
        const suggestions = (action.suggestions || []) as Array<{ name: string; stars: number; pricePerNight: number; reason?: string }>;
        return (
            <div style={{
                marginTop: "0.5rem",
                padding: "0.75rem",
                borderRadius: "0.75rem",
                background: "rgba(16, 185, 129, 0.06)",
                border: "1px solid rgba(16, 185, 129, 0.15)",
                fontSize: "0.82rem",
            }}>
                <div style={{ fontWeight: 600, color: "#10b981", marginBottom: "0.25rem" }}>🏨 Hotel Suggestions</div>
                {suggestions.map((h, i) => (
                    <div key={i} style={{ color: "#94a3b8", marginBottom: "0.25rem" }}>
                        • <strong style={{ color: "#f1f5f9" }}>{h.name}</strong> {"⭐".repeat(Math.min(h.stars || 3, 5))} — ₹{h.pricePerNight?.toLocaleString()}/night
                        {h.reason && <span style={{ color: "#64748b" }}> ({h.reason})</span>}
                    </div>
                ))}
            </div>
        );
    }

    if (action.type === "suggest_flights") {
        const suggestions = (action.suggestions || []) as Array<{ airline: string; route: string; price: number; tip?: string }>;
        return (
            <div style={{
                marginTop: "0.5rem",
                padding: "0.75rem",
                borderRadius: "0.75rem",
                background: "rgba(6, 182, 212, 0.06)",
                border: "1px solid rgba(6, 182, 212, 0.15)",
                fontSize: "0.82rem",
            }}>
                <div style={{ fontWeight: 600, color: "#06b6d4", marginBottom: "0.25rem" }}>✈️ Flight Suggestions</div>
                {suggestions.map((f, i) => (
                    <div key={i} style={{ color: "#94a3b8", marginBottom: "0.25rem" }}>
                        • <strong style={{ color: "#f1f5f9" }}>{f.airline}</strong> {f.route} — ₹{f.price?.toLocaleString()}
                        {f.tip && <span style={{ color: "#64748b" }}> ({f.tip})</span>}
                    </div>
                ))}
            </div>
        );
    }

    if (action.type === "suggest_experiences") {
        const suggestions = (action.suggestions || []) as Array<{ name: string; category: string; cost: number; description?: string }>;
        return (
            <div style={{
                marginTop: "0.5rem",
                padding: "0.75rem",
                borderRadius: "0.75rem",
                background: "rgba(245, 158, 11, 0.06)",
                border: "1px solid rgba(245, 158, 11, 0.15)",
                fontSize: "0.82rem",
            }}>
                <div style={{ fontWeight: 600, color: "#f59e0b", marginBottom: "0.25rem" }}>🎯 Experience Suggestions</div>
                {suggestions.map((e, i) => (
                    <div key={i} style={{ color: "#94a3b8", marginBottom: "0.25rem" }}>
                        • <strong style={{ color: "#f1f5f9" }}>{e.name}</strong> ({e.category}) — {e.cost > 0 ? `₹${e.cost}` : "free"}
                        {e.description && <span style={{ color: "#64748b" }}> · {e.description}</span>}
                    </div>
                ))}
            </div>
        );
    }

    if (action.type === "budget_tip") {
        return (
            <div style={{
                marginTop: "0.5rem",
                padding: "0.75rem",
                borderRadius: "0.75rem",
                background: "rgba(16, 185, 129, 0.06)",
                border: "1px solid rgba(16, 185, 129, 0.15)",
                fontSize: "0.82rem",
            }}>
                <div style={{ fontWeight: 600, color: "#10b981", marginBottom: "0.25rem" }}>💰 Budget Tip</div>
                <div style={{ color: "#94a3b8" }}>{action.tip}</div>
                {action.savings && (
                    <div style={{ color: "#10b981", marginTop: "0.25rem" }}>
                        💸 Save up to ₹{action.savings.toLocaleString()}
                    </div>
                )}
            </div>
        );
    }

    return null;
}

// ─── Suggestion chips ─────────────────────────────────────────────────────────

const QUICK_SUGGESTIONS = [
    "Add a beach sunset activity 🌅",
    "Suggest budget hotels 🏨",
    "Best local food to try 🍜",
    "Make day 2 more relaxed 😌",
    "Cheaper flight options ✈️",
    "Hidden gems nearby 💎",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PlannerChat() {
    const { state, dispatch } = useTrip();
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [pendingActions, setPendingActions] = useState<Map<string, ChatAction[]>>(new Map());
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [state.chatMessages, isTyping]);

    const applyAction = (action: ChatAction) => {
        if (action.type === "update_day" && action.newActivities) {
            // Update itinerary days in state
            const updatedItinerary = JSON.parse(JSON.stringify(state.itinerary || {}));
            for (const city of updatedItinerary.cities || []) {
                const day = city.days?.find((d: Record<string, unknown>) => d.dayNumber === action.dayNumber);
                if (day) {
                    day.title = action.newTitle || day.title;
                    day.activities = action.newActivities;
                    break;
                }
            }
            dispatch({ type: "SET_ITINERARY", payload: updatedItinerary });
        }
    };

    const sendMessage = async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText) return;

        const userMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: "user",
            content: messageText,
            timestamp: new Date().toISOString(),
        };

        dispatch({ type: "ADD_CHAT_MESSAGE", payload: userMsg });
        setInput("");
        setIsTyping(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7071/api";
            const response = await fetch(`${apiUrl}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: messageText,
                    itinerary: state.itinerary || {},
                    chatHistory: state.chatMessages.slice(-6),
                }),
            });

            const data = await response.json();

            if (data.success && data.data) {
                const { response: reply, actions = [] } = data.data;

                const aiMsg: ChatMessage = {
                    id: `msg-${Date.now()}-ai`,
                    role: "assistant",
                    content: reply || "Happy to help! What else can I do for you?",
                    timestamp: new Date().toISOString(),
                };
                dispatch({ type: "ADD_CHAT_MESSAGE", payload: aiMsg });

                // Store actions keyed to message ID for rendering
                if (actions.length > 0) {
                    setPendingActions(prev => new Map(prev).set(aiMsg.id, actions));
                }
            } else {
                throw new Error(data.error || "No response from planner");
            }
        } catch (error) {
            console.error("Chat error:", error);
            const errorMsg: ChatMessage = {
                id: `msg-${Date.now()}-error`,
                role: "assistant",
                content: "I'm having trouble connecting right now. Try asking: 'What should I eat in Goa?' or 'Give me beach activity ideas' 🏖️",
                timestamp: new Date().toISOString(),
            };
            dispatch({ type: "ADD_CHAT_MESSAGE", payload: errorMsg });
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="glass" style={{ borderRadius: "1rem", overflow: "hidden" }}>
            {/* Header */}
            <div style={{
                padding: "0.875rem 1.25rem",
                borderBottom: "1px solid rgba(99, 102, 241, 0.1)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
            }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} />
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Chat with Planner Agent</span>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>— powered by GPT-4o</span>
            </div>

            {/* Messages */}
            <div style={{
                maxHeight: "340px",
                overflowY: "auto",
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
            }}>
                {state.chatMessages.length === 0 && (
                    <div style={{ textAlign: "center", padding: "0.75rem 0" }}>
                        <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>✨</div>
                        <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1rem" }}>
                            I can update your itinerary, suggest hotels, find experiences, give travel tips and more!
                        </div>
                        {/* Quick suggestion chips */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center" }}>
                            {QUICK_SUGGESTIONS.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => sendMessage(s)}
                                    style={{
                                        padding: "0.3rem 0.65rem",
                                        borderRadius: "1rem",
                                        background: "rgba(99, 102, 241, 0.1)",
                                        border: "1px solid rgba(99, 102, 241, 0.2)",
                                        color: "#818cf8",
                                        fontSize: "0.75rem",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                    }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {state.chatMessages.map((msg) => (
                    <div key={msg.id}>
                        <div
                            className="animate-fade-in"
                            style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}
                        >
                            {msg.role === "assistant" && (
                                <div style={{
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "50%",
                                    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "0.7rem",
                                    marginRight: "0.5rem",
                                    flexShrink: 0,
                                    marginTop: "0.25rem",
                                }}>✦</div>
                            )}
                            <div style={{
                                maxWidth: "82%",
                                padding: "0.65rem 0.9rem",
                                borderRadius: msg.role === "user" ? "1rem 1rem 0.25rem 1rem" : "1rem 1rem 1rem 0.25rem",
                                background: msg.role === "user"
                                    ? "linear-gradient(135deg, #6366f1, #4f46e5)"
                                    : "rgba(30, 41, 59, 0.8)",
                                fontSize: "0.875rem",
                                lineHeight: 1.5,
                                border: msg.role === "assistant" ? "1px solid rgba(99,102,241,0.1)" : "none",
                            }}>
                                {msg.content}
                            </div>
                        </div>

                        {/* Action cards below AI messages */}
                        {msg.role === "assistant" && pendingActions.get(msg.id)?.map((action, i) => (
                            <div key={i} style={{ paddingLeft: "32px" }}>
                                <ActionCard
                                    action={action}
                                    onApply={() => applyAction(action)}
                                />
                            </div>
                        ))}
                    </div>
                ))}

                {isTyping && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0" }}>
                        <div style={{
                            width: "24px", height: "24px", borderRadius: "50%",
                            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem",
                        }}>✦</div>
                        <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                            {[0, 1, 2].map((i) => (
                                <div key={i} style={{
                                    width: "6px", height: "6px", borderRadius: "50%",
                                    background: "#818cf8",
                                    animation: `typing-dots 1.2s ease-in-out ${i * 0.2}s infinite`,
                                }} />
                            ))}
                            <span style={{ fontSize: "0.78rem", color: "#64748b", marginLeft: "0.25rem" }}>
                                Planner is thinking...
                            </span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
                padding: "0.75rem 1rem",
                borderTop: "1px solid rgba(99, 102, 241, 0.1)",
                display: "flex",
                gap: "0.5rem",
            }}>
                <input
                    className="input"
                    type="text"
                    placeholder="e.g., Add a sunset beach walk on day 3..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isTyping}
                    style={{ flex: 1, padding: "0.625rem 1rem", fontSize: "0.875rem" }}
                />
                <button
                    className="btn-primary"
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isTyping}
                    style={{ padding: "0.625rem 1.25rem", opacity: !input.trim() || isTyping ? 0.5 : 1 }}
                >
                    Send
                </button>
            </div>
        </div>
    );
}
