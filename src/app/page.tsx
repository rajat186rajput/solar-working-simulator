import { TopBar } from "@/components/TopBar";
import { ModeSidebar } from "@/components/ModeSidebar";
import { DiagramLayout } from "@/components/DiagramLayout";
import { RealSetupTicker } from "@/components/RealSetupTicker";
import { RealSetupComparisonStrip } from "@/components/RealSetupComparisonStrip";
import { RealSetupToast } from "@/components/RealSetupToast";

export default function Home() {
  return (
    // Outer wrapper — full viewport, no overflow
    <div className="h-screen overflow-hidden flex flex-col text-text-primary">
      {/* Mode sidebar — fixed overlay, slides from left */}
      <ModeSidebar />

      {/* TOP BAR */}
      <TopBar />

      {/* F.1 — Family Rules ticker + B — connection comparison strip (Real Setup only, no-op otherwise) */}
      <RealSetupTicker />
      <RealSetupComparisonStrip />

      {/* F.2 — contextual rule-violation toast (fixed overlay, Real Setup only) */}
      <RealSetupToast />

      {/*
        MAIN BODY — fills remaining height
        Vertical stack: TopStrip + full-page SVG diagram (+ optional docked panel)
      */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* ── Diagram Layout — SVG + optional docked Ghar panel ── */}
        <DiagramLayout />

      </main>
    </div>
  );
}
