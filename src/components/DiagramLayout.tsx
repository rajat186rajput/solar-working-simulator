"use client";

import dynamic from "next/dynamic";
import { useSimStore } from "@/store/simulation-store";
import { GharDrawerContents } from "@/components/schematic/SchematicSVG";
import { useCallback } from "react";

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

  const closeDrawer = useCallback(() => setGharDrawerOpen(false), [setGharDrawerOpen]);
  const togglePin   = useCallback(
    () => setGharDrawerPinned(!gharDrawerPinned),
    [gharDrawerPinned, setGharDrawerPinned]
  );

  const showDockedPanel = gharDrawerPinned && gharDrawerOpen;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* SVG section — shrinks when docked panel is visible */}
      <section
        className="flex-1 min-h-0 min-w-0 overflow-hidden bg-surface-card/20"
      >
        <SchematicSVG />
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
