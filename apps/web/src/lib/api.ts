/**
 * DRIFT — API Client
 * Fetch wrappers for all backend routes + SSE helper.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7071/api";

// ============================================================================
// Types
// ============================================================================

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

interface AgentEvent {
    id: string;
    type: "thinking" | "searching" | "found" | "filtering" | "complete" | "error" | "progress";
    agent: "planner" | "retriever" | "executor";
    message: string;
    data?: Record<string, unknown>;
    timestamp: string;
}

// ============================================================================
// Core Fetcher
// ============================================================================

async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options.headers,
            },
        });

        const data = await res.json();
        return data as ApiResponse<T>;
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Network error",
        };
    }
}

// ============================================================================
// Plan API
// ============================================================================

export async function planTrip(input: {
    destination: string;
    startDate: string;
    endDate: string;
    travelers: number;
    budget: number;
    currency: string;
    theme: string;
    activityLevel: string;
    specialRequests?: string;
}) {
    return apiFetch("/plan", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

// ============================================================================
// Retrieve API
// ============================================================================

export async function retrieveOptions(input: {
    cities: Array<{
        cityName: string;
        iataCode: string;
        arrivalDate: string;
        departureDate: string;
        location: { lat: number; lng: number };
    }>;
    startDate: string;
    endDate: string;
    travelers: number;
    budget: number;
    currency: string;
}) {
    return apiFetch("/retrieve", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

// ============================================================================
// Retrieve with SSE Streaming
// ============================================================================

export async function retrieveWithStreaming(
    input: {
        cities: Array<Record<string, unknown>>;
        startDate: string;
        endDate: string;
        travelers: number;
        budget: number;
        currency: string;
    },
    onEvent: (event: AgentEvent) => void
): Promise<void> {
    try {
        const res = await fetch(`${API_BASE}/retrieve/stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const text = await res.text();
        const lines = text.split("\n").filter(Boolean);

        for (const line of lines) {
            try {
                const event = JSON.parse(line) as AgentEvent;
                onEvent(event);
                // Small delay for visual effect
                await new Promise((r) => setTimeout(r, 300));
            } catch {
                // Skip malformed lines
            }
        }
    } catch (error) {
        onEvent({
            id: "error",
            type: "error",
            agent: "retriever",
            message: `Connection error: ${error instanceof Error ? error.message : "Unknown"}`,
            timestamp: new Date().toISOString(),
        });
    }
}

// ============================================================================
// Execute Booking API
// ============================================================================

export async function executeBooking(input: {
    tripId: string;
    userId?: string;
    flights: Array<Record<string, unknown>>;
    hotels: Array<Record<string, unknown>>;
    experiences: Array<Record<string, unknown>>;
    totalCost: number;
    currency: string;
    paymentMethod?: string;
}) {
    return apiFetch("/execute", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

// ============================================================================
// Chat API
// ============================================================================

export async function chatWithPlanner(input: {
    message: string;
    itinerary: Record<string, unknown>;
    chatHistory?: Array<{ role: string; content: string }>;
}) {
    return apiFetch("/chat", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

// ============================================================================
// Trip API
// ============================================================================

export async function getTrip(tripId: string, userId: string = "anonymous") {
    return apiFetch(`/trip/${tripId}?userId=${userId}`);
}

export async function getTrips(userId: string = "anonymous") {
    return apiFetch(`/trips?userId=${userId}`);
}

// ============================================================================
// Health Check
// ============================================================================

export async function healthCheck() {
    return apiFetch("/health");
}
