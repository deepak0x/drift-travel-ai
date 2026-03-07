"use client";

/**
 * DRIFT — Planner Chat Component
 * Natural language modifications to itinerary.
 */

import { useState, useRef, useEffect } from "react";
import { useTrip } from "@/lib/store";
import type { ChatMessage } from "@/lib/store";

export default function PlannerChat() {
    const { state, dispatch } = useTrip();
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [state.chatMessages]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: "user",
            content: input.trim(),
            timestamp: new Date().toISOString(),
        };

        dispatch({ type: "ADD_CHAT_MESSAGE", payload: userMsg });
        setInput("");
        setIsTyping(true);

        // Simulate AI response (replace with real API call)
        setTimeout(() => {
            const responses = [
                "I've updated the itinerary based on your request! The changes are reflected in the plan above.",
                "Great idea! I've moved the activities around and adjusted the timing. Check the itinerary tab for the updated schedule.",
                "Done! I've added that to your plan and recalculated the budget. You still have room in your budget for more activities.",
                "I've swapped those experiences out. The new activities better match your preference. Take a look!",
            ];

            const aiMsg: ChatMessage = {
                id: `msg-${Date.now()}-ai`,
                role: "assistant",
                content: responses[Math.floor(Math.random() * responses.length)],
                timestamp: new Date().toISOString(),
            };

            dispatch({ type: "ADD_CHAT_MESSAGE", payload: aiMsg });
            setIsTyping(false);
        }, 1500);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="glass" style={{ borderRadius: "1rem", overflow: "hidden" }}>
            {/* Chat Header */}
            <div
                style={{
                    padding: "0.875rem 1.25rem",
                    borderBottom: "1px solid rgba(99, 102, 241, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                }}
            >
                <div
                    style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#10b981",
                    }}
                />
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Chat with Planner Agent</span>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>— modify your itinerary</span>
            </div>

            {/* Messages */}
            <div
                style={{
                    maxHeight: "300px",
                    overflowY: "auto",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                }}
            >
                {state.chatMessages.length === 0 && (
                    <div style={{ textAlign: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.85rem" }}>
                        💬 Ask the Planner Agent to modify your itinerary.
                        <br />
                        <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                            e.g., &quot;Add more food experiences&quot; or &quot;Make day 2 more relaxed&quot;
                        </span>
                    </div>
                )}

                {state.chatMessages.map((msg) => (
                    <div
                        key={msg.id}
                        className="animate-fade-in"
                        style={{
                            display: "flex",
                            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                        }}
                    >
                        <div
                            style={{
                                maxWidth: "80%",
                                padding: "0.75rem 1rem",
                                borderRadius: msg.role === "user" ? "1rem 1rem 0.25rem 1rem" : "1rem 1rem 1rem 0.25rem",
                                background:
                                    msg.role === "user"
                                        ? "linear-gradient(135deg, #6366f1, #4f46e5)"
                                        : "rgba(30, 41, 59, 0.8)",
                                fontSize: "0.9rem",
                                lineHeight: 1.5,
                            }}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem" }}>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: "6px",
                                        height: "6px",
                                        borderRadius: "50%",
                                        background: "#818cf8",
                                        animation: `typing-dots 1.2s ease-in-out ${i * 0.2}s infinite`,
                                    }}
                                />
                            ))}
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Planner is thinking...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
                style={{
                    padding: "0.75rem 1rem",
                    borderTop: "1px solid rgba(99, 102, 241, 0.1)",
                    display: "flex",
                    gap: "0.5rem",
                }}
            >
                <input
                    className="input"
                    type="text"
                    placeholder="e.g., Add more food experiences to day 1..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isTyping}
                    style={{ flex: 1, padding: "0.625rem 1rem" }}
                />
                <button
                    className="btn-primary"
                    onClick={sendMessage}
                    disabled={!input.trim() || isTyping}
                    style={{ padding: "0.625rem 1.25rem", opacity: !input.trim() || isTyping ? 0.5 : 1 }}
                >
                    Send
                </button>
            </div>
        </div>
    );
}
