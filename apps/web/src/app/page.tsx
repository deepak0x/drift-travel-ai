"use client";

/**
 * DRIFT — Landing Page / Trip Input Form
 * Screen 1: Destination, dates, travelers, budget, theme, activity level
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTrip } from "@/lib/store";

const themes = [
  { value: "adventure", label: "Adventure", icon: "🏔️" },
  { value: "relaxation", label: "Relaxation", icon: "🏖️" },
  { value: "cultural", label: "Cultural", icon: "🏛️" },
  { value: "romantic", label: "Romantic", icon: "💕" },
  { value: "family", label: "Family", icon: "👨‍👩‍👧‍👦" },
  { value: "budget", label: "Budget", icon: "💰" },
  { value: "luxury", label: "Luxury", icon: "✨" },
  { value: "business", label: "Business", icon: "💼" },
];

const activityLevels = [
  { value: "relaxed", label: "Relaxed", desc: "Slow-paced, plenty of free time", icon: "🌅" },
  { value: "moderate", label: "Moderate", desc: "Balanced mix of activities & rest", icon: "⚖️" },
  { value: "packed", label: "Packed", desc: "Action-packed, see everything!", icon: "🚀" },
];

export default function Home() {
  const router = useRouter();
  const { dispatch } = useTrip();

  const [form, setForm] = useState({
    destination: "",
    startDate: "",
    endDate: "",
    travelers: 2,
    budget: 150000,
    currency: "INR",
    theme: "cultural",
    activityLevel: "moderate",
    specialRequests: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.destination || !form.startDate || !form.endDate) return;

    setIsSubmitting(true);
    dispatch({ type: "SET_INPUT", payload: form });
    dispatch({ type: "SET_STEP", payload: "planning" });
    router.push("/plan");
  };

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", padding: "2rem 1rem" }}>
      {/* Hero Section */}
      <div
        className="animate-fade-in"
        style={{
          textAlign: "center",
          maxWidth: "700px",
          margin: "0 auto 3rem",
          paddingTop: "2rem",
        }}
      >
        <div
          className="animate-float"
          style={{ fontSize: "4rem", marginBottom: "1rem" }}
        >
          ✈️
        </div>
        <h1
          className="gradient-text"
          style={{
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            marginBottom: "1rem",
          }}
        >
          Where will you drift to?
        </h1>
        <p
          style={{
            fontSize: "1.15rem",
            color: "#94a3b8",
            lineHeight: 1.6,
            maxWidth: "560px",
            margin: "0 auto",
          }}
        >
          Tell us your dream trip. Our AI agents will plan the perfect itinerary,
          find the best flights &amp; hotels, all within your budget.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="glass animate-slide-up"
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          borderRadius: "1.5rem",
          padding: "2.5rem",
        }}
      >
        {/* Destination */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label htmlFor="destination">Where do you want to go?</label>
          <input
            id="destination"
            className="input"
            type="text"
            placeholder="e.g. Rajasthan, Goa & Kerala or Japan..."
            value={form.destination}
            onChange={(e) => updateField("destination", e.target.value)}
            required
            style={{ fontSize: "1.1rem", padding: "1rem 1.25rem" }}
          />
        </div>

        {/* Dates */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <label htmlFor="startDate">Start Date</label>
            <input
              id="startDate"
              className="input"
              type="date"
              value={form.startDate}
              onChange={(e) => updateField("startDate", e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="endDate">End Date</label>
            <input
              id="endDate"
              className="input"
              type="date"
              value={form.endDate}
              onChange={(e) => updateField("endDate", e.target.value)}
              required
            />
          </div>
        </div>

        {/* Travelers & Budget */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <label htmlFor="travelers">Travelers</label>
            <input
              id="travelers"
              className="input"
              type="number"
              min={1}
              max={20}
              value={form.travelers}
              onChange={(e) => updateField("travelers", parseInt(e.target.value) || 1)}
            />
          </div>
          <div>
            <label htmlFor="budget">Total Budget (₹)</label>
            <input
              id="budget"
              className="input"
              type="number"
              min={5000}
              step={5000}
              value={form.budget}
              onChange={(e) => updateField("budget", parseInt(e.target.value) || 50000)}
            />
          </div>
        </div>

        {/* Trip Theme */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label>Trip Theme</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "0.5rem",
            }}
          >
            {themes.map((t) => (
              <button
                type="button"
                key={t.value}
                onClick={() => updateField("theme", t.value)}
                style={{
                  padding: "0.75rem 0.5rem",
                  borderRadius: "0.75rem",
                  border:
                    form.theme === t.value
                      ? "2px solid #6366f1"
                      : "1px solid rgba(51, 65, 85, 0.5)",
                  background:
                    form.theme === t.value
                      ? "rgba(99, 102, 241, 0.12)"
                      : "rgba(15, 23, 42, 0.5)",
                  color: form.theme === t.value ? "#818cf8" : "#94a3b8",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: form.theme === t.value ? 600 : 400,
                  transition: "all 0.2s ease",
                  fontFamily: "var(--font-sans)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Activity Level */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label>Activity Level</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
            {activityLevels.map((a) => (
              <button
                type="button"
                key={a.value}
                onClick={() => updateField("activityLevel", a.value)}
                style={{
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border:
                    form.activityLevel === a.value
                      ? "2px solid #6366f1"
                      : "1px solid rgba(51, 65, 85, 0.5)",
                  background:
                    form.activityLevel === a.value
                      ? "rgba(99, 102, 241, 0.12)"
                      : "rgba(15, 23, 42, 0.5)",
                  color: form.activityLevel === a.value ? "#f1f5f9" : "#94a3b8",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <div style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>{a.icon}</div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{a.label}</div>
                <div style={{ fontSize: "0.75rem", opacity: 0.7, marginTop: "0.125rem" }}>
                  {a.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Special Requests */}
        <div style={{ marginBottom: "2rem" }}>
          <label htmlFor="specialRequests">Special Requests (optional)</label>
          <textarea
            id="specialRequests"
            className="input"
            rows={2}
            placeholder="e.g. vegetarian food, wheelchair accessible, kid-friendly..."
            value={form.specialRequests}
            onChange={(e) => updateField("specialRequests", e.target.value)}
            style={{ resize: "vertical" }}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting || !form.destination}
          style={{
            width: "100%",
            padding: "1rem",
            fontSize: "1.1rem",
            opacity: isSubmitting || !form.destination ? 0.5 : 1,
          }}
        >
          {isSubmitting ? (
            <span>🧠 Agents are thinking...</span>
          ) : (
            <span>✨ Plan My Trip with AI</span>
          )}
        </button>
      </form>

      {/* Bottom Features */}
      <div
        className="animate-fade-in stagger-3"
        style={{
          maxWidth: "720px",
          margin: "2rem auto 0",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
          opacity: 0,
        }}
      >
        {[
          { icon: "🤖", title: "AI Agents", desc: "3 specialized agents plan your trip" },
          { icon: "💰", title: "Budget Smart", desc: "Real-time budget tracking" },
          { icon: "⚡", title: "Live Data", desc: "Real flights & hotel prices" },
        ].map((f) => (
          <div
            key={f.title}
            style={{
              textAlign: "center",
              padding: "1.25rem",
              borderRadius: "1rem",
              background: "rgba(30, 41, 59, 0.3)",
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{f.icon}</div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem" }}>
              {f.title}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
