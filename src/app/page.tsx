import dynamic from "next/dynamic";
import { TopBar } from "@/components/TopBar";
import { ApplianceGrid } from "@/components/controls/ApplianceGrid";
import { ControlsPanel } from "@/components/controls/ControlsPanel";

// SSR-off for heavy animated SVG (Framer Motion + particles)
const SchematicSVG = dynamic(
  () =>
    import("@/components/schematic/SchematicSVG").then((m) => ({
      default: m.SchematicSVG,
    })),
  { ssr: false }
);

export default function Home() {
  return (
    // Outer wrapper — full viewport, no overflow
    <div className="h-screen overflow-hidden flex flex-col bg-surface-dark text-text-primary">
      {/* TOP BAR — 2 rows (~h-14 + h-[50px] = ~h-[110px]) */}
      <TopBar />

      {/*
        MAIN BODY — fills remaining height
        Vertical stack: SVG diagram (30vh) on top, controls (70vh) on bottom
      */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* ── TOP 30vh — Schematic SVG (full width) ── */}
        <section
          className="
            w-full
            shrink-0
            border-b border-surface-stroke
            bg-surface-card/20
            overflow-hidden
            p-2
          "
          style={{ height: "30vh", minHeight: 200 }}
        >
          <SchematicSVG />
        </section>

        {/* ── BOTTOM — Appliances (left/center) + Controls (right), full width, scrollable ── */}
        <section
          className="
            flex-1
            flex flex-col lg:flex-row
            min-h-0
            overflow-hidden
          "
        >
          {/* Appliances — takes most of the width */}
          <div
            className="
              flex-1
              p-3
              min-h-0
              overflow-y-auto
              scrollbar-thin
              border-b lg:border-b-0 lg:border-r border-surface-stroke
            "
          >
            <ApplianceGrid />
          </div>

          {/* Controls (time slider, day type) — fixed width on desktop, full width on mobile */}
          <div
            className="
              w-full lg:w-72 xl:w-80
              shrink-0
              p-3
              min-h-0
              overflow-y-auto
              scrollbar-thin
            "
          >
            <ControlsPanel />
          </div>
        </section>

      </main>
    </div>
  );
}
