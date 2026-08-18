"use client";

import dynamic from "next/dynamic";
import { useSimStore } from "@/store/simulation-store";
import { GharDrawerContents } from "@/components/schematic/SchematicSVG";
import { ApplianceGrid } from "@/components/controls/ApplianceGrid";
import { RealSetupNameplate } from "@/components/RealSetupNameplate";
import { L } from "@/lib/i18n";
import type { ConnectionId, PcuMode } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";

// B — mobile connection toggle (full-width 2-seg), sits directly above the
// "Appliances / Tap to toggle" header, per 03_REAL_SETUP_DESIGN.md Section B.
function MobileConnectionToggle() {
  const { activeConnection, setActiveConnection, lang } = useSimStore();
  const OPTS: { id: ConnectionId; titleKey: "connection1Title" | "connection2Title"; subKey: "connection1Sub" | "connection2Sub" }[] = [
    { id: "connection-1", titleKey: "connection1Title", subKey: "connection1Sub" },
    { id: "connection-2", titleKey: "connection2Title", subKey: "connection2Sub" },
  ];
  return (
    <div className="grid grid-cols-2 gap-1.5 px-3 pt-2.5" role="group" aria-label={L(lang, "connectionAria")}>
      {OPTS.map((o) => {
        const isActive = activeConnection === o.id;
        return (
          <button
            key={o.id}
            onClick={() => setActiveConnection(o.id)}
            aria-pressed={isActive}
            className={`min-h-[44px] rounded-lg border px-2 py-1.5 text-center transition-all ${
              isActive
                ? "border-solar bg-solar/10 text-solar"
                : "border-surface-stroke bg-surface-card/40 text-text-secondary"
            }`}
          >
            <div className="text-[11px] font-semibold">{L(lang, o.titleKey)}</div>
            <div className="text-[9px] opacity-70">{L(lang, o.subKey)}</div>
          </button>
        );
      })}
    </div>
  );
}

// GATE-2 round-3 (Rajat: sidebar handle floats over the appliance grid on
// mobile) — ModeSidebar's collapsed handle is now hidden below 768px
// (`hidden md:flex` there). This compact row is the <768px replacement: the
// same 4 PCU-mode chips + net-meter switch as the desktop sidebar's
// PcuModeGrid/NetMeterToggle, condensed to fit under the Connection toggle
// without a floating overlay. Only rendered <768px (`md:hidden`) so tablet
// (768–1023, where the sidebar handle is still shown) doesn't get both.
function MobilePcuModeRow() {
  const { pcuMode, setPcuMode, netMeterInstalled, setNetMeterInstalled, lang } = useSimStore();

  const CHIPS: { value: PcuMode; labelKey: "pcuModePCU" | "pcuModeSMART" | "pcuModeHYBRID" | "pcuModeGRIDEXPORT" }[] = [
    { value: "pcu", labelKey: "pcuModePCU" },
    { value: "smart", labelKey: "pcuModeSMART" },
    { value: "hybrid-pcu", labelKey: "pcuModeHYBRID" },
    { value: "grid-export", labelKey: "pcuModeGRIDEXPORT" },
  ];

  return (
    <div className="md:hidden px-3 pt-2.5" role="group" aria-label={L(lang, "pcuModeMobileHeading")}>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1.5">
        {L(lang, "pcuModeMobileHeading")}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {CHIPS.map((chip) => {
          const isActive = pcuMode === chip.value;
          const isGridExport = chip.value === "grid-export";
          const disabled = isGridExport && !netMeterInstalled;
          return (
            <button
              key={chip.value}
              onClick={() => !disabled && setPcuMode(chip.value)}
              disabled={disabled}
              aria-pressed={isActive}
              title={disabled ? L(lang, "pcuGridExportDisabled") : undefined}
              className={`relative min-h-[36px] rounded-lg border px-1 py-1 text-center text-[9px] font-semibold leading-tight transition-all ${
                disabled
                  ? "opacity-40 cursor-not-allowed border-surface-stroke"
                  : isActive
                    ? "border-solar bg-solar/10 text-solar"
                    : "border-surface-stroke bg-surface-card/40 text-text-secondary"
              }`}
            >
              {disabled && (
                <span className="absolute top-0.5 right-0.5 text-text-muted">
                  <Lock size={8} />
                </span>
              )}
              {L(lang, chip.labelKey)}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2 rounded-lg border border-surface-stroke bg-surface-card/40 px-2.5 py-2">
        <span className="text-[10px] text-text-primary">{L(lang, "netMeterLabel")}</span>
        <Switch
          checked={netMeterInstalled}
          onCheckedChange={setNetMeterInstalled}
          aria-label={L(lang, "netMeterLabel")}
        />
      </div>
    </div>
  );
}

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
    simView,
  } = useSimStore();
  const isRealSetup = simView === "real-setup";

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
        {/* Diagram — GATE-1 (Rajat: "~150px dead space under the schematic
            on mobile") + GATE-2 round-3 (Rajat: "node text unreadable at
            375px"): SchematicSVG now owns its own mobile sizing internally —
            a normal-flow mode-pill row above a horizontally-scrollable,
            aspect-locked canvas (no dead space, no viewBox-crushed text). No
            fixed aspect-ratio wrapper needed here anymore; height is
            entirely intrinsic to SchematicSVG's own content. */}
        <section className="w-full shrink-0">
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
          {/* B — Connection toggle, mobile-only, above the Appliances header */}
          {isRealSetup && <MobileConnectionToggle />}
          {/* GATE-2 round-3 — PCU-mode chips + net-meter, <768px only (sidebar
              handle covers this at >=768px tablet widths) */}
          {isRealSetup && <MobilePcuModeRow />}

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
          <div className="p-3 flex flex-col gap-3">
            <ApplianceGrid />
            {/* E — System Nameplate, appended at the bottom of the mobile scroll */}
            {isRealSetup && <RealSetupNameplate />}
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
