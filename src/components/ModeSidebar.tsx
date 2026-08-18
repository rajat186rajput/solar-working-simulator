"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock } from "lucide-react";
import { useSimStore } from "@/store/simulation-store";
import type { Mode, ConnectionId, PcuMode } from "@/lib/types";
import { L } from "@/lib/i18n";
import { PCU_PRIORITY_CHAINS } from "@/lib/realSetup";
import { PriorityChain } from "@/components/schematic/PriorityChain";
import { Switch } from "@/components/ui/switch";

const MODES: {
  value: Mode;
  icon: string;
  label: string;
  description: string;
}[] = [
  {
    value: "on-grid",
    icon: "🔌",
    label: "On-Grid",
    description: "Connected to UPPCL grid. Solar + grid power your home. No battery.",
  },
  {
    value: "off-grid",
    icon: "🔆",
    label: "Off-Grid",
    description: "Fully independent. Solar + battery only. No grid connection.",
  },
  {
    value: "hybrid",
    icon: "⚡",
    label: "Hybrid",
    description: "Best of both. Solar + battery + grid. Auto-switches on grid failure.",
  },
];

// ── B — Connection selector cards ──────────────────────────────────────────
function ConnectionCards() {
  const { activeConnection, setActiveConnection, otherConnectionSummary, lang } = useSimStore();

  const CONN: { id: ConnectionId; titleKey: "connection1Title" | "connection2Title"; subKey: "connection1Sub" | "connection2Sub" }[] = [
    { id: "connection-1", titleKey: "connection1Title", subKey: "connection1Sub" },
    { id: "connection-2", titleKey: "connection2Title", subKey: "connection2Sub" },
  ];

  return (
    <div className="flex flex-col gap-2">
      {CONN.map((c) => {
        const isActive = activeConnection === c.id;
        return (
          <button
            key={c.id}
            onClick={() => setActiveConnection(c.id)}
            aria-pressed={isActive}
            className={`flex items-center justify-between w-full rounded-xl border px-3 py-2.5 text-left transition-all ${
              isActive
                ? "border-solar bg-solar/10 text-solar"
                : "border-surface-stroke bg-surface-card/40 text-text-secondary hover:border-solar/30 hover:text-text-primary"
            }`}
          >
            <div>
              <div className="text-sm font-semibold flex items-center gap-1">
                {L(lang, c.titleKey)}
                {isActive && <span className="text-solar text-xs">✓</span>}
              </div>
              <div className="text-[10px] opacity-70">{L(lang, c.subKey)}</div>
            </div>
            {!isActive && (
              <div className="text-[10px] font-mono tabular-nums text-text-muted text-right">
                {Math.round(otherConnectionSummary.loadW)}W
                <br />
                {Math.round(otherConnectionSummary.batterySoc * 100)}%
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── C — PCU mode chip list (single-column, full-width — GATE-1 sidebar
// polish: the earlier 2×2 grid squeezed each chip to ~100px, which wrapped
// "GRID EXPORT" onto a second line UNDER the absolutely-positioned Lock
// badge (text collided with the icon) and cramped the SMART/HYBRID
// Day-Night / Load-Charge priority-chain rows. Single column gives each
// chip the full ~208px sidebar content width — plenty of room for the
// longest label ("GRID EXPORT") plus the priority-chain icons on one line,
// at both 1440 and 1024 (the sidebar itself is a fixed w-60 overlay, not
// viewport-relative, so its own internal layout doesn't change with
// viewport width — only whether it's visible/reachable does). ────────────
function PcuModeGrid() {
  const { pcuMode, setPcuMode, netMeterInstalled, lang } = useSimStore();

  const CHIPS: { value: PcuMode; labelKey: "pcuModePCU" | "pcuModeSMART" | "pcuModeHYBRID" | "pcuModeGRIDEXPORT" }[] = [
    { value: "pcu", labelKey: "pcuModePCU" },
    { value: "smart", labelKey: "pcuModeSMART" },
    { value: "hybrid-pcu", labelKey: "pcuModeHYBRID" },
    { value: "grid-export", labelKey: "pcuModeGRIDEXPORT" },
  ];

  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">
        {L(lang, "pcuModeHeading")}
      </div>
      <div className="grid grid-cols-1 gap-2">
        {CHIPS.map((chip) => {
          const isActive = pcuMode === chip.value;
          const isGridExport = chip.value === "grid-export";
          const disabled = isGridExport && !netMeterInstalled;
          const chain = PCU_PRIORITY_CHAINS[chip.value];

          return (
            <button
              key={chip.value}
              onClick={() => !disabled && setPcuMode(chip.value)}
              disabled={disabled}
              aria-pressed={isActive}
              title={disabled ? L(lang, "pcuGridExportDisabled") : undefined}
              aria-label={
                disabled ? `${L(lang, chip.labelKey)} — ${L(lang, "pcuGridExportDisabled")}` : L(lang, chip.labelKey)
              }
              className={`flex flex-col items-stretch gap-1.5 rounded-xl border px-3 py-2.5 text-left transition-all w-full min-h-[52px] ${
                disabled
                  ? "opacity-40 cursor-not-allowed border-surface-stroke"
                  : isActive
                    ? "border-solar bg-solar/10"
                    : "border-surface-stroke bg-surface-card/40 hover:border-solar/30"
              }`}
            >
              {/* Label row — name on the left, factory-default tag OR the
                  disabled-lock icon on the right, both IN NORMAL FLOW (no
                  absolute positioning) so neither can ever sit on top of
                  wrapped/adjacent text. */}
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-semibold ${isActive ? "text-solar" : "text-text-primary"}`}>
                  {L(lang, chip.labelKey)}
                </span>
                {chip.value === "smart" ? (
                  <span className="shrink-0 text-[8px] font-normal text-text-muted">
                    {L(lang, "pcuModeSMARTBadge")}
                  </span>
                ) : disabled ? (
                  <Lock size={10} className="shrink-0 text-text-muted" />
                ) : null}
              </div>
              {chip.value === "smart" ? (
                <div className="flex flex-col gap-1">
                  <PriorityChain
                    chain={chain.day ?? []}
                    label={L(lang, "pcuModeSMARTDay").split(":")[0]}
                    ariaLabel={L(lang, "pcuModeSMARTDay")}
                  />
                  <PriorityChain
                    chain={chain.night ?? []}
                    label={L(lang, "pcuModeSMARTNight").split(":")[0]}
                    ariaLabel={L(lang, "pcuModeSMARTNight")}
                  />
                </div>
              ) : chip.value === "hybrid-pcu" ? (
                <div className="flex flex-col gap-1">
                  <PriorityChain
                    chain={chain.load}
                    label={L(lang, "pcuModeHYBRIDLoad").split(":")[0]}
                    ariaLabel={L(lang, "pcuModeHYBRIDLoad")}
                  />
                  <PriorityChain
                    chain={chain.charge ?? []}
                    label={L(lang, "pcuModeHYBRIDCharge").split(":")[0]}
                    ariaLabel={L(lang, "pcuModeHYBRIDCharge")}
                  />
                </div>
              ) : chip.value === "pcu" ? (
                <PriorityChain chain={chain.load} ariaLabel={L(lang, "pcuModePCUSub")} />
              ) : (
                <PriorityChain chain={chain.load} ariaLabel={L(lang, "pcuModeGRIDEXPORTSub")} />
              )}
            </button>
          );
        })}
      </div>
      {/* "Grid Export disabled" copy lives ONCE, under the NetMeterToggle
          switch below (netMeterOffCopy is the exact same {en,hi} string) —
          it used to also render here, duplicating the same sentence twice
          in one sidebar. Per-chip disabled state still has its own title/
          aria-label + inline Lock icon above, which is not a text dupe. */}
    </div>
  );
}

// ── D — Net-meter toggle ────────────────────────────────────────────────────
function NetMeterToggle() {
  const { netMeterInstalled, setNetMeterInstalled, lang } = useSimStore();
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">
        {L(lang, "netMeterHeading")}
      </div>
      <div className="flex items-center justify-between rounded-xl border border-surface-stroke bg-surface-card/40 px-3 py-2.5">
        <span className="text-xs text-text-primary">{L(lang, "netMeterLabel")}</span>
        <Switch
          checked={netMeterInstalled}
          onCheckedChange={setNetMeterInstalled}
          aria-label={L(lang, "netMeterLabel")}
        />
      </div>
      <p className="text-[10px] leading-relaxed mt-1.5 text-text-muted">
        {netMeterInstalled ? L(lang, "netMeterOnCopy") : L(lang, "netMeterOffCopy")}
      </p>
    </div>
  );
}

export function ModeSidebar() {
  const { mode, setMode, simView, lang } = useSimStore();
  const [open, setOpen] = useState(false);
  // GATE-1 item 7 (discoverability): first-ever entry into Real Setup on
  // desktop auto-opens this sidebar once so the Connection cards / PCU-mode
  // chips / net-meter toggle are visible without the user having to notice
  // the thin collapsed handle. autoOpenedRef guards it to a single fire per
  // session (not on every simView flip back and forth).
  //
  // The sidebar is a FIXED overlay (not a layout sibling that pushes
  // content) — left open, it permanently hides the Solar/Grid nodes behind
  // it, which defeats the point of a diagram demo. So it auto-CLOSES again
  // after a few seconds: enough to register "oh, there's a panel here" plus
  // read the Connection/PCU-mode/net-meter controls, without permanently
  // blocking the schematic. autoCloseTimerRef lets a manual toggle during
  // that window cancel the pending auto-close instead of fighting the user.
  const autoOpenedRef = useRef(false);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (simView !== "real-setup" || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setOpen(true);
      autoCloseTimerRef.current = setTimeout(() => setOpen(false), 4000);
    }
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, [simView]);

  const handleToggle = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    setOpen((v) => !v);
  };

  return (
    <>
      {/* ── Toggle tab (fixed, left-center) ──
          GATE-1 item 7 — a floating text label next to this handle was
          tried first, but at every viewport height that label's fixed
          top-1/2 position could land on top of the Solar/Grid node cards
          (confirmed by measuring getBoundingClientRect overlap directly —
          the diagram's own vertical position shifts with header/ticker
          chrome height, so no single fixed offset was safe everywhere).
          A native `title` tooltip renders in the browser's own overlay
          layer — it can never collide with page content — and the small
          pulsing dot is confined to the 20px-wide handle itself, nowhere
          near any node's card (cards start at x≈38px+). */}
      {/* GATE-2 round-3 (Rajat: handle floats over the appliance grid on
          mobile) — hidden below 768px; DiagramLayout's MobilePcuModeRow is
          the <768px replacement for Connection/PCU-mode/net-meter access
          (Connection cards are already always visible via
          MobileConnectionToggle at every mobile width). */}
      <button
        onClick={handleToggle}
        aria-label={open ? "Close simulation mode panel" : "Open simulation mode panel"}
        aria-expanded={open}
        title={!open && simView === "real-setup" ? L(lang, "sidebarHint") : undefined}
        className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-40 items-center justify-center w-5 h-14 rounded-r-lg bg-surface-card border border-l-0 border-surface-stroke text-text-muted hover:text-solar hover:border-solar/40 transition-colors"
        style={{ boxShadow: "2px 0 8px rgba(0,0,0,0.4)" }}
      >
        <span
          className="text-[11px] font-bold select-none transition-transform"
          style={{ transform: open ? "none" : "none" }}
        >
          {open ? "◀" : "▶"}
        </span>
        {!open && simView === "real-setup" && (
          <motion.span
            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-solar"
            initial={{ opacity: 0.5, scale: 1 }}
            animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.3, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
        )}
      </button>

      {/* ── Sliding panel ── */}
      <AnimatePresence>
        {open && (
          <motion.aside
            key="mode-sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.22, ease: "easeInOut" }}
            className="fixed left-0 top-0 h-full z-30 w-60 bg-surface-dark border-r border-surface-stroke shadow-2xl flex flex-col pt-16 pb-6 px-4 gap-4 overflow-y-auto scrollbar-thin"
            aria-label={simView === "real-setup" ? "Real Setup — House No. 89 controls" : "Simulation mode selector"}
            data-testid="mode-sidebar-panel"
          >
            {simView === "real-setup" ? (
              <>
                <div className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-1">
                  {L(lang, "connectionHeading")}
                </div>
                <ConnectionCards />
                <div className="border-t border-surface-stroke pt-3">
                  <PcuModeGrid />
                </div>
                <div className="border-t border-surface-stroke pt-3">
                  <NetMeterToggle />
                </div>
              </>
            ) : (
              <>
                <div className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-1">
                  Simulation Mode
                </div>

                {MODES.map((m) => {
                  const isActive = mode === m.value;
                  return (
                    <button
                      key={m.value}
                      onClick={() => { setMode(m.value); setOpen(false); }}
                      aria-pressed={isActive}
                      className={`flex flex-col items-start gap-1 w-full rounded-xl border px-4 py-3 text-left transition-all ${
                        isActive
                          ? "border-solar bg-solar/10 text-solar"
                          : "border-surface-stroke bg-surface-card/40 text-text-secondary hover:border-solar/30 hover:text-text-primary"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <span>{m.icon}</span>
                        <span>{m.label}</span>
                        {isActive && (
                          <span className="ml-auto text-solar text-xs">✓</span>
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-70">{m.description}</p>
                    </button>
                  );
                })}
              </>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Click-away backdrop (subtle) ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mode-sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-20 bg-black/30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
    </>
  );
}
