"use client";

/**
 * DRIFT — Client-side State Management
 * React Context for trip data, budget tracking, and selected options.
 */

import React, { createContext, useContext, useReducer, ReactNode } from "react";

// ============================================================================
// Types
// ============================================================================

interface TripInput {
    destination: string;
    startDate: string;
    endDate: string;
    travelers: number;
    budget: number;
    currency: string;
    theme: string;
    activityLevel: string;
    specialRequests?: string;
}

interface BudgetSummary {
    total: number;
    spent: number;
    remaining: number;
    currency: string;
    breakdown: {
        flights: number;
        hotels: number;
        experiences: number;
        other: number;
    };
}

interface AgentEvent {
    id: string;
    type: string;
    agent: string;
    message: string;
    data?: Record<string, unknown>;
    timestamp: string;
}

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
}

interface TripState {
    // Trip input
    input: TripInput | null;
    tripId: string | null;

    // Itinerary from Planner Agent
    itinerary: Record<string, unknown> | null;

    // Options from Retriever Agent
    flights: Array<Record<string, unknown>>;
    hotels: Array<Record<string, unknown>>;
    experiences: Array<Record<string, unknown>>;

    // Selections
    selectedFlights: Array<Record<string, unknown>>;
    selectedHotels: Array<Record<string, unknown>>;
    selectedExperiences: Array<Record<string, unknown>>;

    // Budget
    budget: BudgetSummary;

    // Agent events (thinking box)
    agentEvents: AgentEvent[];

    // Chat
    chatMessages: ChatMessage[];

    // Booking
    booking: Record<string, unknown> | null;

    // UI state
    loading: boolean;
    currentStep: "input" | "planning" | "customizing" | "reviewing" | "booked";
}

// ============================================================================
// Actions
// ============================================================================

type TripAction =
    | { type: "SET_INPUT"; payload: TripInput }
    | { type: "SET_TRIP_ID"; payload: string }
    | { type: "SET_ITINERARY"; payload: Record<string, unknown> }
    | { type: "SET_OPTIONS"; payload: { flights: Array<Record<string, unknown>>; hotels: Array<Record<string, unknown>>; experiences: Array<Record<string, unknown>> } }
    | { type: "TOGGLE_FLIGHT"; payload: Record<string, unknown> }
    | { type: "TOGGLE_HOTEL"; payload: Record<string, unknown> }
    | { type: "TOGGLE_EXPERIENCE"; payload: Record<string, unknown> }
    | { type: "ADD_AGENT_EVENT"; payload: AgentEvent }
    | { type: "CLEAR_AGENT_EVENTS" }
    | { type: "ADD_CHAT_MESSAGE"; payload: ChatMessage }
    | { type: "SET_BOOKING"; payload: Record<string, unknown> }
    | { type: "SET_LOADING"; payload: boolean }
    | { type: "SET_STEP"; payload: TripState["currentStep"] }
    | { type: "UPDATE_BUDGET" }
    | { type: "RESET" };

// ============================================================================
// Initial State
// ============================================================================

const initialState: TripState = {
    input: null,
    tripId: null,
    itinerary: null,
    flights: [],
    hotels: [],
    experiences: [],
    selectedFlights: [],
    selectedHotels: [],
    selectedExperiences: [],
    budget: {
        total: 0,
        spent: 0,
        remaining: 0,
        currency: "INR",
        breakdown: { flights: 0, hotels: 0, experiences: 0, other: 0 },
    },
    agentEvents: [],
    chatMessages: [],
    booking: null,
    loading: false,
    currentStep: "input",
};

// ============================================================================
// Reducer
// ============================================================================

function tripReducer(state: TripState, action: TripAction): TripState {
    switch (action.type) {
        case "SET_INPUT":
            return {
                ...state,
                input: action.payload,
                budget: {
                    ...state.budget,
                    total: action.payload.budget,
                    remaining: action.payload.budget,
                    currency: action.payload.currency,
                },
            };

        case "SET_TRIP_ID":
            return { ...state, tripId: action.payload };

        case "SET_ITINERARY":
            return { ...state, itinerary: action.payload };

        case "SET_OPTIONS":
            return {
                ...state,
                flights: action.payload.flights,
                hotels: action.payload.hotels,
                experiences: action.payload.experiences,
            };

        case "TOGGLE_FLIGHT": {
            const flight = action.payload;
            const exists = state.selectedFlights.some((f) => f.id === flight.id);
            const selectedFlights = exists
                ? state.selectedFlights.filter((f) => f.id !== flight.id)
                : [...state.selectedFlights, flight];
            return recalcBudget({ ...state, selectedFlights });
        }

        case "TOGGLE_HOTEL": {
            const hotel = action.payload;
            const exists = state.selectedHotels.some((h) => h.id === hotel.id);
            const selectedHotels = exists
                ? state.selectedHotels.filter((h) => h.id !== hotel.id)
                : [...state.selectedHotels, hotel];
            return recalcBudget({ ...state, selectedHotels });
        }

        case "TOGGLE_EXPERIENCE": {
            const exp = action.payload;
            const exists = state.selectedExperiences.some((e) => e.id === exp.id);
            const selectedExperiences = exists
                ? state.selectedExperiences.filter((e) => e.id !== exp.id)
                : [...state.selectedExperiences, exp];
            return recalcBudget({ ...state, selectedExperiences });
        }

        case "ADD_AGENT_EVENT":
            return {
                ...state,
                agentEvents: [...state.agentEvents, action.payload],
            };

        case "CLEAR_AGENT_EVENTS":
            return { ...state, agentEvents: [] };

        case "ADD_CHAT_MESSAGE":
            return {
                ...state,
                chatMessages: [...state.chatMessages, action.payload],
            };

        case "SET_BOOKING":
            return { ...state, booking: action.payload };

        case "SET_LOADING":
            return { ...state, loading: action.payload };

        case "SET_STEP":
            return { ...state, currentStep: action.payload };

        case "UPDATE_BUDGET":
            return recalcBudget(state);

        case "RESET":
            return initialState;

        default:
            return state;
    }
}

function recalcBudget(state: TripState): TripState {
    const flightCost = state.selectedFlights.reduce(
        (sum, f) => sum + (Number(f.price) || 0),
        0
    );
    const hotelCost = state.selectedHotels.reduce(
        (sum, h) => sum + (Number(h.totalPrice) || 0),
        0
    );
    const expCost = state.selectedExperiences.reduce(
        (sum, e) => sum + (Number(e.estimatedCost) || 0),
        0
    );
    const spent = flightCost + hotelCost + expCost;

    return {
        ...state,
        budget: {
            ...state.budget,
            spent,
            remaining: state.budget.total - spent,
            breakdown: {
                flights: flightCost,
                hotels: hotelCost,
                experiences: expCost,
                other: 0,
            },
        },
    };
}

// ============================================================================
// Context
// ============================================================================

const TripContext = createContext<{
    state: TripState;
    dispatch: React.Dispatch<TripAction>;
}>({
    state: initialState,
    dispatch: () => null,
});

export function TripProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(tripReducer, initialState);
    return (
        <TripContext.Provider value= {{ state, dispatch }
}>
    { children }
    </TripContext.Provider>
    );
}

export function useTrip() {
    const context = useContext(TripContext);
    if (!context) {
        throw new Error("useTrip must be used within a TripProvider");
    }
    return context;
}

export type { TripState, TripAction, TripInput, BudgetSummary, AgentEvent, ChatMessage };
