import { TopBar } from "@/components/TopBar";
import { ModeSidebar } from "@/components/ModeSidebar";
import { DiagramLayout } from "@/components/DiagramLayout";

export default function Home() {
  return (
    // Outer wrapper — full viewport, no overflow
    <div className="h-screen overflow-hidden flex flex-col bg-surface-dark text-text-primary">
      {/* Mode sidebar — fixed overlay, slides from left */}
      <ModeSidebar />

      {/* TOP BAR */}
      <TopBar />

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
