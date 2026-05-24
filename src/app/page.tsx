import dynamic from "next/dynamic";
import { HeroSection } from "@/components/hero/HeroSection";
import { StatsBar } from "@/components/stats/StatsBar";
import { AppliancePanel } from "@/components/controls/AppliancePanel";
import { TimeSlider } from "@/components/controls/TimeSlider";
import { ScenarioGrid } from "@/components/controls/ScenarioGrid";
import { BatteryGauge } from "@/components/controls/BatteryGauge";
import { GridToggle } from "@/components/controls/GridToggle";
import { CompareTable } from "@/components/education/CompareTable";
import { MisconceptionAccordion } from "@/components/education/MisconceptionAccordion";

// SSR-off for heavy animated SVG (Framer Motion + particles)
const SchematicSVG = dynamic(
  () => import("@/components/schematic/SchematicSVG").then((m) => ({ default: m.SchematicSVG })),
  { ssr: false }
);

export default function Home() {
  return (
    <div className="min-h-screen bg-surface-dark text-text-primary">
      {/* Navbar */}
      <nav className="sticky top-0 z-[100] bg-surface-dark/90 backdrop-blur-md border-b border-surface-stroke px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 40 40" width="28" height="28" fill="none" aria-label="SolarSim logo">
            <circle cx="20" cy="20" r="7" stroke="#F6C90E" strokeWidth="2" />
            {/* 8 rays */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
              if (deg === 0 || deg === 180) return null; // circuit trace replaces these
              const rad = (deg * Math.PI) / 180;
              const x1 = 20 + Math.cos(rad) * 9.5;
              const y1 = 20 + Math.sin(rad) * 9.5;
              const x2 = 20 + Math.cos(rad) * 13;
              const y2 = 20 + Math.sin(rad) * 13;
              return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F6C90E" strokeWidth="2" strokeLinecap="round" />;
            })}
            {/* Circuit trace (horizontal) */}
            <line x1="6" y1="20" x2="34" y2="20" stroke="#F6C90E" strokeWidth="2" />
            <circle cx="6" cy="20" r="1.5" fill="#F6C90E" />
            <circle cx="34" cy="20" r="1.5" fill="#F6C90E" />
          </svg>
          <span className="font-display font-semibold text-text-primary text-lg">SolarSim</span>
        </div>
        <div className="text-xs text-text-muted hidden md:block">
          Mandawar, Bijnor UP — 4.4 kWp Hybrid System
        </div>
      </nav>

      {/* Hero */}
      <HeroSection />

      {/* Stats bar + Mode Toggle */}
      <StatsBar />

      {/* Main simulator section */}
      <main id="simulator" className="max-w-screen-xl mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Schematic — 7 cols */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-surface-stroke bg-surface-card/40 p-2 md:p-4">
              <SchematicSVG />
            </div>
          </div>

          {/* Controls — 5 cols */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-surface-stroke bg-surface-card/40 p-4">
              <TimeSlider />
            </div>
            <div className="rounded-2xl border border-surface-stroke bg-surface-card/40 p-4">
              <AppliancePanel />
            </div>
            <ScenarioGrid />
            <BatteryGauge />
            <GridToggle />
          </div>
        </div>
      </main>

      {/* Education panel */}
      <section className="bg-surface-card/30 border-t border-surface-stroke py-16 mt-8">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 space-y-12">
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
      <footer className="bg-surface-dark border-t border-surface-stroke py-8">
        <div className="max-w-screen-xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-solar text-lg">☀️</span>
            <div>
              <div className="font-display font-semibold text-text-primary text-sm">SolarSim</div>
              <div className="text-text-muted text-xs">Educational Solar Simulator</div>
            </div>
          </div>
          <div className="text-text-muted text-xs text-center max-w-sm">
            Purely educational, non-commercial. All figures are indicative based on Bijnor (26°N) solar data.
            Not a substitute for a professional solar assessment.
          </div>
          <div className="text-text-muted text-xs">
            Built by Rajat Rajput · 2026
          </div>
        </div>
      </footer>

      {/* Reset to Default — sticky button */}
      <ResetButton />
    </div>
  );
}

// Client component for the reset button
import { ResetButton } from "@/components/controls/ResetButton";
