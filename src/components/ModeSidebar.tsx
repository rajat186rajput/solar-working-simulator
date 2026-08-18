"use client";

import { useState } from "react";
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

// ── C — PCU mode 2×2 chip grid ─────────────────────────────────────────────
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
      <div className="grid grid-cols-2 gap-2">
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
              className={`relative flex flex-col items-start gap-1 rounded-xl border px-2.5 py-2 text-left transition-all w-full ${
                disabled
                  ? "opacity-40 cursor-not-allowed border-surface-stroke"
                  : isActive
                    ? "border-solar bg-solar/10"
                    : "border-surface-stroke bg-surface-card/40 hover:border-solar/30"
              }`}
            >
              {disabled && (
                <span className="absolute top-1.5 right-1.5 text-text-muted">
                  <Lock size={10} />
                </span>
              )}
              <div className={`text-xs font-semibold ${isActive ? "text-solar" : "text-text-primary"}`}>
                {L(lang, chip.labelKey)}
                {chip.value === "smart" && (
                  <span className="ml-1 text-[8px] font-normal text-text-muted align-middle">
                    {L(lang, "pcuModeSMARTBadge")}
                  </span>
                )}
              </div>
              {chip.value === "smart" ? (
                <div className="flex flex-col gap-0.5">
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
                <div className="flex flex-col gap-0.5">
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
      {!netMeterInstalled && (
        <p className="text-[10px] leading-relaxed mt-2 text-text-muted flex items-center gap-1">
          <Lock size={10} className="shrink-0" />
          {L(lang, "pcuGridExportDisabled")}
        </p>
      )}
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

  return (
    <>
      {/* ── Toggle tab (fixed, left-center) ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close simulation mode panel" : "Open simulation mode panel"}
        aria-expanded={open}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center w-5 h-14 rounded-r-lg bg-surface-card border border-l-0 border-surface-stroke text-text-muted hover:text-solar hover:border-solar/40 transition-colors"
        style={{ boxShadow: "2px 0 8px rgba(0,0,0,0.4)" }}
      >
        <span
          className="text-[11px] font-bold select-none transition-transform"
          style={{ transform: open ? "none" : "none" }}
        >
          {open ? "◀" : "▶"}
        </span>
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
