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
    // Outer wrapper — full viewport, no overflow on desktop
    <div className="h-screen overflow-hidden flex flex-col bg-surface-dark text-text-primary">
      {/* TOP BAR — 2 rows (~h-14 + h-[50px] = ~h-[110px]) */}
      <TopBar />

      {/*
        MAIN BODY — fills remaining height
        Desktop (lg+): flex-row 60/40 split, no overflow
        Mobile (<lg): flex-col, scrollable
      */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden">

        {/* ── LEFT 60% — Schematic ONLY (full height) ── */}
        <section
          className="
            w-full lg:w-[60%]
            min-h-0
            border-b lg:border-b-0 lg:border-r border-surface-stroke
            overflow-hidden
            bg-surface-card/20
            p-2
          "
        >
          <SchematicSVG />
        </section>

        {/* ── RIGHT 40% — Appliances (top) + Controls (bottom) ── */}
        <section
          className="
            w-full lg:w-[40%]
            flex flex-col
            min-h-0
            overflow-hidden
          "
        >
          {/* TOP ~65% of right column — Appliance grid */}
          <div className="flex-[65] p-2 min-h-0 overflow-y-auto scrollbar-thin border-b border-surface-stroke">
            <ApplianceGrid />
          </div>

          {/* BOTTOM ~35% of right column — Time slider + Day-type */}
          <div className="flex-[35] p-2 min-h-0 overflow-y-auto scrollbar-thin">
            <ControlsPanel />
          </div>
        </section>

      </main>
    </div>
  );
}
