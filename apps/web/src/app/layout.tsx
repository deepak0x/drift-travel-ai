import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TripProvider } from "@/lib/store";
import Header from "@/components/Header";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "DRIFT — AI-Powered Travel Planner",
  description:
    "Plan, customize, and book your perfect trip with AI-powered agents. DRIFT uses intelligent agents to create personalized itineraries within your budget.",
  keywords: ["travel", "AI", "trip planner", "flights", "hotels", "itinerary"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <TripProvider>
          <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
            <Header />
            <main>{children}</main>
          </div>
        </TripProvider>
      </body>
    </html>
  );
}
