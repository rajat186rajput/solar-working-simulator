import Link from "next/link";
import { CompareTable } from "@/components/education/CompareTable";
import { MisconceptionAccordion } from "@/components/education/MisconceptionAccordion";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Solar Guide — On-Grid vs Off-Grid vs Hybrid | SolarSim",
  description:
    "Detailed comparison of On-Grid, Off-Grid, and Hybrid solar systems. 7 common misconceptions busted. Mandawar, Bijnor UP specific guidance.",
};

export default function LearnPage() {
  return (
    <div className="min-h-screen bg-surface-dark text-text-primary">
      {/* Top bar */}
      <nav className="sticky top-0 z-50 bg-surface-dark/95 backdrop-blur-md border-b border-surface-stroke px-4 md:px-6 py-3 flex items-center justify-between h-14">
        <Link
          href="/"
          className="flex items-center gap-2 text-text-secondary hover:text-solar transition-colors text-sm font-medium"
        >
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
            <path d="M12 4L6 10l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Simulator
        </Link>
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 40 40" width="22" height="22" fill="none" aria-label="SolarSim logo">
            <circle cx="20" cy="20" r="7" stroke="#F6C90E" strokeWidth="2" />
            {[45, 90, 135, 225, 270, 315].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const x1 = 20 + Math.cos(rad) * 9.5;
              const y1 = 20 + Math.sin(rad) * 9.5;
              const x2 = 20 + Math.cos(rad) * 13;
              const y2 = 20 + Math.sin(rad) * 13;
              return (
                <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F6C90E" strokeWidth="2" strokeLinecap="round" />
              );
            })}
            <line x1="6" y1="20" x2="34" y2="20" stroke="#F6C90E" strokeWidth="2" />
            <circle cx="6" cy="20" r="1.5" fill="#F6C90E" />
            <circle cx="34" cy="20" r="1.5" fill="#F6C90E" />
          </svg>
          <span className="font-display font-semibold text-text-primary">SolarSim — Guide</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-surface-dark via-[#0a1628] to-surface-dark py-12 md:py-16 px-4 md:px-6">
        <div className="max-w-screen-lg mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-solar/10 border border-solar/20 text-solar text-xs font-medium">
            <span>☀️</span>
            <span>Educational Guide</span>
          </div>
          <h1 className="font-display font-bold text-text-primary text-3xl md:text-5xl leading-tight">
            Solar System —{" "}
            <span className="text-solar">Live Dekho,</span>
            <br />
            Live Samjho
          </h1>
          <p className="text-text-secondary text-base md:text-lg max-w-2xl mx-auto">
            On-Grid, Off-Grid, aur Hybrid ka fark — data se samjho. Mandawar ke liye kaunsa system sahi hai?
          </p>
          <Link
            href="/"
            className="inline-block bg-solar text-surface-dark font-semibold px-8 py-3 rounded-full text-sm hover:bg-solar/90 transition-colors"
          >
            Simulator Try Karo ↗
          </Link>
        </div>

        {/* Key stats */}
        <div className="max-w-screen-lg mx-auto mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Panel Capacity", value: "4.4 kWp", sub: "8 panels, Durasol" },
            { label: "Peak Solar", value: "4,180 W", sub: "12 PM clear day" },
            { label: "Battery", value: "5.12 kWh", sub: "LiFePO4, 4.38 kWh usable" },
            { label: "Location", value: "Bijnor, UP", sub: "26°N, 5.0 PSH/day" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-surface-card/60 border border-surface-stroke rounded-xl p-4 text-center"
            >
              <div className="text-solar font-bold font-display text-lg">{stat.value}</div>
              <div className="text-text-primary text-xs font-medium mt-0.5">{stat.label}</div>
              <div className="text-text-muted text-[10px] mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Compare + Misconceptions */}
      <section className="py-12 md:py-16 px-4 md:px-6">
        <div className="max-w-screen-lg mx-auto space-y-12">
          <div>
            <h2 className="text-2xl font-bold font-display text-text-primary mb-2">
              On-Grid vs Off-Grid vs Hybrid — Comparison
            </h2>
            <p className="text-text-secondary text-sm mb-6">
              Mandawar ke liye kaunsa system sahi hai? Data se samjho.
            </p>
            <CompareTable />
          </div>

          <MisconceptionAccordion />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-dark border-t border-surface-stroke py-8 px-6">
        <div className="max-w-screen-lg mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-text-muted text-xs text-center max-w-sm">
            Purely educational, non-commercial. All figures are indicative based on Bijnor (26°N) solar data.
            Not a substitute for a professional solar assessment.
          </div>
          <div className="text-text-muted text-xs">Built by Rajat Rajput · 2026</div>
        </div>
      </footer>
    </div>
  );
}
