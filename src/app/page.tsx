import dynamic from "next/dynamic";
import { TopBar } from "@/components/TopBar";
import { TopStrip } from "@/components/TopStrip";
import { ModeSidebar } from "@/components/ModeSidebar";

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
      {/* Mode sidebar — fixed overlay, slides from left */}
      <ModeSidebar />

      {/* TOP BAR */}
      <TopBar />

      {/*
        MAIN BODY — fills remaining height
        Vertical stack: TopStrip + full-page SVG diagram
      */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* ── TOP STRIP — Time slider + Weather buttons ── */}
        <TopStrip />

        {/* ── SVG Diagram — fills all remaining space ── */}
        <section
          className="
            flex-1
            w-full
            min-h-0
            overflow-hidden
            bg-surface-card/20
          "
        >
          <SchematicSVG />
        </section>

      </main>
    </div>
  );
}
