// ============================================================================
// DRIFT — Shared TypeScript Types
// ============================================================================

// ---------- User ----------
export interface User {
  id: string;
  name: string;
  email: string;
  preferences: UserPreferences;
  createdAt: string;
}

export interface UserPreferences {
  currency: string;
  defaultBudget?: number;
  favoriteThemes?: TripTheme[];
  activityLevel?: ActivityLevel;
}

// ---------- Trip ----------
export interface Trip {
  id: string;
  userId: string;
  status: TripStatus;
  input: TripInput;
  itinerary: Itinerary | null;
  cities: City[];
  budget: BudgetSummary;
  createdAt: string;
  updatedAt: string;
}

export type TripStatus =
  | "draft"
  | "planning"
  | "customizing"
  | "reviewing"
  | "booked"
  | "completed"
  | "cancelled";

export type TripTheme =
  | "adventure"
  | "relaxation"
  | "cultural"
  | "romantic"
  | "family"
  | "business"
  | "budget"
  | "luxury";

export type ActivityLevel = "relaxed" | "moderate" | "packed";

export interface TripInput {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number;
  currency: string;
  themes: TripTheme[];
  activityLevel: ActivityLevel;
  specialRequests?: string;
}

// ---------- Itinerary ----------
export interface Itinerary {
  id: string;
  tripId: string;
  cities: CityPlan[];
  totalDays: number;
  summary: string;
}

export interface CityPlan {
  cityName: string;
  country: string;
  days: DayPlan[];
  arrivalDate: string;
  departureDate: string;
}

export interface DayPlan {
  dayNumber: number;
  date: string;
  title: string;
  activities: Activity[];
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  category: ExperienceCategory;
  startTime: string;
  endTime: string;
  estimatedCost: number;
  location: GeoLocation;
}

export type ExperienceCategory =
  | "sightseeing"
  | "food"
  | "adventure"
  | "culture"
  | "shopping"
  | "nightlife"
  | "nature"
  | "wellness";

// ---------- City ----------
export interface City {
  name: string;
  country: string;
  iataCode: string;
  location: GeoLocation;
  imageUrl?: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

// ---------- Flight ----------
export interface Flight {
  id: string;
  airline: string;
  airlineLogo?: string;
  flightNumber: string;
  departure: FlightEndpoint;
  arrival: FlightEndpoint;
  duration: string;
  stops: number;
  price: number;
  currency: string;
  cabinClass: string;
  seatsAvailable?: number;
  selected?: boolean;
}

export interface FlightEndpoint {
  airport: string;
  iataCode: string;
  dateTime: string;
  terminal?: string;
}

// ---------- Hotel ----------
export interface Hotel {
  id: string;
  name: string;
  address: string;
  city: string;
  rating: number;
  stars: number;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  amenities: string[];
  imageUrl?: string;
  location: GeoLocation;
  checkIn: string;
  checkOut: string;
  roomType: string;
  selected?: boolean;
}

// ---------- Experience ----------
export interface Experience {
  id: string;
  name: string;
  description: string;
  category: ExperienceCategory;
  location: GeoLocation;
  rating?: number;
  estimatedCost: number;
  duration: string;
  imageUrl?: string;
  city: string;
  selected?: boolean;
}

// ---------- Booking ----------
export interface Booking {
  id: string;
  tripId: string;
  userId: string;
  flights: Flight[];
  hotels: Hotel[];
  experiences: Experience[];
  totalCost: number;
  currency: string;
  status: BookingStatus;
  paymentId?: string;
  pdfUrl?: string;
  qrCodes: QRCode[];
  createdAt: string;
}

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "payment_processing"
  | "paid"
  | "cancelled"
  | "refunded";

export interface QRCode {
  label: string;
  data: string;
  imageUrl: string;
}

// ---------- Budget ----------
export interface BudgetSummary {
  total: number;
  spent: number;
  remaining: number;
  currency: string;
  breakdown: BudgetBreakdown;
}

export interface BudgetBreakdown {
  flights: number;
  hotels: number;
  experiences: number;
  other: number;
}

// ---------- Agent Events (SSE) ----------
export interface AgentEvent {
  id: string;
  type: AgentEventType;
  agent: AgentName;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export type AgentEventType =
  | "thinking"
  | "searching"
  | "found"
  | "filtering"
  | "complete"
  | "error"
  | "progress";

export type AgentName = "planner" | "retriever" | "executor";

// ---------- API Response ----------
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ---------- Chat ----------
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
