import dynamic from "next/dynamic";
import { TopBar } from "@/components/TopBar";
import { DashboardColumn } from "@/components/stats/DashboardColumn";
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
      {/* TOP BAR — fixed height h-14 */}
      <TopBar />

      {/* MAIN BODY — fills remaining height */}
      {/*
        Desktop (lg+): flex-row 20/80 split, no overflow
        Mobile (<lg): flex-col, scrollable
      */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden">

        {/* ── LEFT COLUMN — 20% dashboard ── */}
        <aside
          className="
            w-full lg:w-[20%]
            flex-shrink-0
            border-b lg:border-b-0 lg:border-r border-surface-stroke
            overflow-y-auto lg:overflow-hidden
            max-h-[260px] lg:max-h-none
          "
        >
          <DashboardColumn />
        </aside>

        {/* ── RIGHT COLUMN — 80% interactive ── */}
        <main
          className="
            flex-1 flex flex-col
            min-h-0 overflow-hidden
          "
        >
          {/* TOP HALF — Schematic (55-60% of right column) */}
          <div
            className="
              flex-[55] min-h-[220px]
              border-b border-surface-stroke
              bg-surface-card/20
              p-2 md:p-3
              overflow-hidden
            "
          >
            <SchematicSVG />
          </div>

          {/* BOTTOM HALF — Appliances left, Controls right */}
          <div className="flex-[45] flex flex-col sm:flex-row min-h-0 overflow-hidden">

            {/* Appliance grid — 58% */}
            <div
              className="
                flex-[58] border-b sm:border-b-0 sm:border-r border-surface-stroke
                p-2.5 overflow-y-auto min-h-[200px] sm:min-h-0
              "
            >
              <ApplianceGrid />
            </div>

            {/* Controls — 42% */}
            <div className="flex-[42] p-2.5 overflow-y-auto min-h-[200px] sm:min-h-0">
              <ControlsPanel />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
