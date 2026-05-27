"use client";

import dynamic from "next/dynamic";
import { useSimStore } from "@/store/simulation-store";
import { GharDrawerContents } from "@/components/schematic/SchematicSVG";
import { ApplianceGrid } from "@/components/controls/ApplianceGrid";
import { useCallback, useEffect, useRef, useState } from "react";

// SSR-off for heavy animated SVG (Framer Motion + particles)
const SchematicSVG = dynamic(
  () =>
    import("@/components/schematic/SchematicSVG").then((m) => ({
      default: m.SchematicSVG,
    })),
  { ssr: false }
);

export function DiagramLayout() {
  const {
    gharDrawerOpen,
    gharDrawerPinned,
    setGharDrawerOpen,
    setGharDrawerPinned,
  } = useSimStore();

  const [isMobile, setIsMobile] = useState(false);
  // Ref to the appliances panel so Ghar node click can scroll it into view on mobile
  const appliancesPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const closeDrawer = useCallback(
    () => setGharDrawerOpen(false),
    [setGharDrawerOpen]
  );
  const togglePin = useCallback(
    () => setGharDrawerPinned(!gharDrawerPinned),
    [gharDrawerPinned, setGharDrawerPinned]
  );

  // On mobile, Ghar node click scrolls to the appliances panel below instead
  // of opening the floating drawer. We pass this as onMobileGharClick.
  const scrollToAppliances = useCallback(() => {
    appliancesPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const showDockedPanel = gharDrawerPinned && gharDrawerOpen;

  // ── MOBILE LAYOUT (<lg / <1024px) ─────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {/* Diagram — fixed height on mobile */}
        <section
          className="w-full min-h-0 shrink-0"
          style={{ height: "45vh" }}
        >
          {/* isMobile=true suppresses the floating GharDrawer inside SchematicSVG */}
          <SchematicSVG isMobile={true} onMobileGharClick={scrollToAppliances} />
        </section>

        {/* Appliances panel — always visible below diagram, scrollable */}
        <div
          ref={appliancesPanelRef}
          className="flex-1 overflow-y-auto border-t border-surface-stroke"
          style={{
            background: "rgba(15,23,42,0.92)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-4 py-2.5 border-b shrink-0 sticky top-0 z-10"
            style={{
              background: "rgba(15,23,42,0.95)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              borderBottomColor: "rgba(255,255,255,0.08)",
            }}
          >
            <span className="text-sm font-semibold text-text-primary">
              Appliances
            </span>
            <span className="text-xs text-text-secondary">
              Tap to toggle
            </span>
          </div>
          <div className="p-3">
            <ApplianceGrid />
          </div>
        </div>
      </div>
    );
  }

  // ── DESKTOP LAYOUT (lg+ / 1024px+) ──────────────────────────────────────
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* SVG section — shrinks when docked panel is visible */}
      <section className="flex-1 min-h-0 min-w-0 overflow-hidden">
        <SchematicSVG isMobile={false} />
      </section>

      {/* Docked aside — only when pinned + open */}
      {showDockedPanel && (
        <aside
          className="shrink-0 overflow-y-auto"
          style={{
            width: 320,
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderLeft: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <GharDrawerContents
            onClose={closeDrawer}
            isPinned={gharDrawerPinned}
            onPinToggle={togglePin}
          />
        </aside>
      )}
    </div>
  );
}
