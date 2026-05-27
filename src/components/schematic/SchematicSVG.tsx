"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback } from "react";
import { useSimStore } from "@/store/simulation-store";
import { calcBackupHours } from "@/lib/simulation";
import { PowerFlowLine } from "./PowerFlowLine";
import { ParticleStream } from "./ParticleStream";
import { ComponentNode } from "./ComponentNode";
import { ApplianceGrid } from "@/components/controls/ApplianceGrid";
import { L } from "@/lib/i18n";
import { fmtRs } from "@/lib/tariff";

// ─── Layout (viewBox 0 0 1000 370) — pure LEFT-TO-RIGHT pipeline ──────────────
//
// COLUMN 1 (LEFT)    COLUMN 2 (CENTER)    COLUMN 3           COLUMN 4 (RIGHT)
//                                          (CENTER-RIGHT)
// [Solar Panels]  →
//                 →  [Hybrid Inverter]  ↔  [Battery]     →  [Ghar / Load]
// [UPPCL Grid]    →
//
// Node geometry (NODE_W=150, NODE_H_BASE=70):
//   Solar:    cx=110, cy=85,  controlsH=60  → total_h=130 → y: 20..150   | right edge x=185
//   Grid:     cx=110, cy=265, controlsH=50  → total_h=120 → y: 205..325  | right edge x=185
//   Inverter: cx=430, cy=150, no controls   → total_h=70  → y: 115..185  | left x=355, right x=505
//   Battery:  cx=670, cy=150, controlsH=90  → total_h=160 → y: 70..230   | left x=595, right x=745
//   Ghar:     cx=890, cy=150, no controls   → total_h=70  → y: 115..185  | left x=815
//
// Flow paths (node-edge to node-edge):
//   Solar    → Inverter : M 185 85  C 300 85  300 150 355 150   (curve top-left → center)
//   Grid     → Inverter : M 185 265 C 300 265 300 150 355 150   (curve bot-left → center)
//   Inverter → Battery  : M 505 150 L 595 150                   (horizontal right)
//   Battery  → Inverter : M 595 154 L 505 154                   (horizontal left — slightly offset)
//   Inverter → Ghar     : M 430 185 L 430 350 L 890 350 L 890 185  (bottom bypass — below Grid bottom)

const PATHS = {
  solar:         "M 185 85  C 300 85  300 150 355 150",
  gridImport:    "M 185 265 C 300 265 300 150 355 150",
  gridExport:    "M 360 154 C 300 154 300 265 185 265",
  batteryCharge: "M 505 150 L 595 150",
  batteryDisch:  "M 595 154 L 505 154",
  load:          "M 430 185 L 430 350 L 890 350 L 890 185",
};

// ─── Solar capacity presets ────────────────────────────────────────────────
const SOLAR_KWP_OPTIONS = [
  { label: "2 kWp",   kwp: 2   },
  { label: "4.4 kWp", kwp: 4.4 },
  { label: "5 kWp",   kwp: 5   },
  { label: "7 kWp",   kwp: 7   },
  { label: "10 kWp",  kwp: 10  },
];

// ─── Battery capacity presets ──────────────────────────────────────────────
const BATTERY_KWH_OPTIONS = [
  { label: "5 kWh",   kwh: 5   },
  { label: "7.5 kWh", kwh: 7.5 },
  { label: "10 kWh",  kwh: 10  },
  { label: "15 kWh",  kwh: 15  },
  { label: "20 kWh",  kwh: 20  },
];

const BATTERY_TYPE_OPTIONS = [
  { label: "LFP (LiFePO4)", value: "lifepo4"   as const },
  { label: "PbA (Lead-Acid)", value: "lead-acid" as const },
];

// ─── Compact inline select style ──────────────────────────────────────────
const SELECT_STYLE: React.CSSProperties = {
  width: "100%",
  fontSize: 10,
  background: "#1E293B",
  border: "1px solid #334155",
  borderRadius: 4,
  padding: "2px 4px",
  color: "#F1F5F9",
  cursor: "pointer",
  outline: "none",
  lineHeight: "1.4",
};

// ─── Small compact toggle switch (iOS-style) ─────────────────────────────
function CompactToggle({
  isOn,
  onToggle,
  onColor = "#F6C90E",
}: {
  isOn: boolean;
  onToggle: () => void;
  onColor?: string;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={isOn}
      style={{
        position: "relative",
        width: 28,
        height: 16,
        borderRadius: 8,
        background: isOn ? onColor : "#334155",
        border: "none",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
        transition: "background 0.18s ease",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: isOn ? 12 : 2,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.18s ease",
          display: "block",
        }}
      />
    </button>
  );
}

// ─── Solar node controls (FIX 3 + FIX 5 + FIX 8) ─────────────────────────
function SolarNodeControls() {
  const { solarOn, toggleSolar, panelKwp, setPanelKwp, lang } = useSimStore();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "4px 2px 0",
        height: "100%",
      }}
    >
      {/* Toggle row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <CompactToggle isOn={solarOn} onToggle={toggleSolar} onColor="#F6C90E" />
        <span style={{ fontSize: 10, color: solarOn ? "#F6C90E" : "#64748B", fontWeight: 600 }}>
          {solarOn ? L(lang, "batteryOn") : L(lang, "batteryOff")}
        </span>
      </div>

      {/* Capacity dropdown */}
      <select
        value={panelKwp}
        onChange={(e) => setPanelKwp(Number(e.target.value))}
        disabled={!solarOn}
        style={{ ...SELECT_STYLE, opacity: solarOn ? 1 : 0.45 }}
        aria-label="Solar panel capacity"
      >
        {SOLAR_KWP_OPTIONS.map((o) => (
          <option key={o.kwp} value={o.kwp}>{o.label}</option>
        ))}
      </select>

      {/* Info line */}
      <div style={{ fontSize: 10, color: solarOn ? "#F6C90E88" : "#47556977", lineHeight: 1 }}>
        {solarOn ? `~${(panelKwp * 4.5).toFixed(0)} kWh/day` : "Disconnected"}
      </div>
    </div>
  );
}

// ─── Battery constants (mirrors simulation.ts) ───────────────────────────
const DOD_FACTOR: Record<"lifepo4" | "lead-acid", number> = {
  lifepo4: 0.90,
  "lead-acid": 0.50,
};
// C-rate for max charge/discharge (same as simulation.ts)
const C_RATE: Record<"lifepo4" | "lead-acid", number> = {
  lifepo4: 0.5,
  "lead-acid": 0.2,
};
const INVERTER_EFF = 0.95;

// ─── Format hours → "2h 15m" or "45m" ───────────────────────────────────
function fmtHours(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

// ─── Battery node controls (FIX 4 + FIX 5 + FIX 10 + SoC slider) ────────
function BatteryNodeControls() {
  const {
    batteryKwh, setBatteryKwh,
    batteryType, setBatteryType,
    batteryOn, toggleBattery,
    batterySoc, setBatterySoc,
    loadW,
    gridAvailable,
    socLocked, setSocLocked,
    lang,
  } = useSimStore();

  const handleKwhChange = (kwh: number) => {
    setBatteryKwh(kwh);
  };

  const backupHrs = batteryOn && batteryKwh > 0
    ? calcBackupHours(batterySoc, batteryKwh, batteryType, loadW)
    : 0;
  const backupDisplay = batteryOn && batteryKwh > 0
    ? backupHrs > 24 ? "24+ hr" : `${backupHrs.toFixed(1)} hr`
    : "—";

  const socColor = batterySoc >= 0.8 ? "#22C55E"
    : batterySoc >= 0.4 ? "#EAB308"
    : batterySoc >= 0.2 ? "#F97316"
    : "#EF4444";

  // Time estimates — always based on battery spec (max C-rate), not variable solar/grid watts
  const usableWh = batteryKwh * DOD_FACTOR[batteryType] * INVERTER_EFF * 1000;
  const maxChargeW = batteryKwh * 1000 * C_RATE[batteryType];
  const maxDischargeW = maxChargeW; // same C-rate for discharge

  // Charging: grid available means battery always charges at max rate
  const canCharge = gridAvailable;
  const timeToFullH = canCharge && batterySoc < 0.99
    ? ((1 - batterySoc) * usableWh) / maxChargeW
    : null;

  // Discharging: no grid and load is drawing power
  const isDischarging = !gridAvailable && loadW > 0;
  const timeToEmptyH = isDischarging && batterySoc > 0.01
    ? (batterySoc * usableWh) / maxDischargeW
    : null;

  let timeEstimate: string;
  if (timeToFullH !== null) {
    timeEstimate = `⚡ ${L(lang, "fullIn")} ${fmtHours(timeToFullH)}`;
  } else if (timeToEmptyH !== null) {
    timeEstimate = `🔋 ${L(lang, "emptyIn")} ${fmtHours(timeToEmptyH)}`;
  } else {
    timeEstimate = L(lang, "idle");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, padding: "4px 2px 0", height: "100%" }}>
      {/* Toggle row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <CompactToggle isOn={batteryOn} onToggle={toggleBattery} onColor="#10B981" />
        <span style={{ fontSize: 10, color: batteryOn ? "#10B981" : "#64748B", fontWeight: 600 }}>
          {batteryOn ? L(lang, "batteryOn") : L(lang, "batteryOff")}
        </span>
        {/* Backup time */}
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#64748B", fontVariantNumeric: "tabular-nums" }}>
          {L(lang, "backupIn")}: <span style={{ color: socColor, fontWeight: 700 }}>{backupDisplay}</span>
        </span>
      </div>

      {/* SoC slider row */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10, color: socColor, fontWeight: 700, fontVariantNumeric: "tabular-nums", minWidth: 28 }}>
            {Math.round(batterySoc * 100)}%
          </span>
          <button
            onClick={() => setSocLocked(!socLocked)}
            aria-label={socLocked ? "Unlock SoC (let simulation update)" : "Lock SoC (manual control)"}
            style={{
              fontSize: 11,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
              color: socLocked ? "#F6C90E" : "#64748B",
            }}
          >
            {socLocked ? "🔒" : "🔓"}
          </button>
          <span style={{ fontSize: 10, color: "#475569", marginLeft: 2 }}>
            {socLocked ? L(lang, "manual") : L(lang, "auto")}
          </span>
        </div>
        {/* Visual gradient bar — read-only SoC display */}
        {(() => {
          const barColor = batterySoc > 0.6 ? '#22c55e' : batterySoc > 0.3 ? '#eab308' : '#ef4444';
          return (
            <div style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: `linear-gradient(to right,
                ${barColor} 0%,
                ${barColor} ${batterySoc * 100}%,
                rgba(255,255,255,0.1) ${batterySoc * 100}%,
                rgba(255,255,255,0.1) 100%)`,
              marginBottom: '4px',
              opacity: batteryOn && batteryKwh > 0 ? 1 : 0.4,
            }} />
          );
        })()}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(batterySoc * 100)}
          onChange={(e) => {
            setBatterySoc(Number(e.target.value) / 100);
            setSocLocked(true);
          }}
          disabled={!batteryOn || batteryKwh <= 0}
          aria-label="Battery state of charge"
          style={{
            width: "100%",
            height: 6,
            accentColor: socColor,
            cursor: batteryOn && batteryKwh > 0 ? "pointer" : "default",
            opacity: batteryOn && batteryKwh > 0 ? 1 : 0.4,
          }}
        />
        {/* Time estimate */}
        <div style={{ fontSize: 10, color: "#94A3B8", lineHeight: 1.2 }}>
          {batteryOn && batteryKwh > 0 ? timeEstimate : "— No battery"}
        </div>
      </div>

      {/* Capacity dropdown */}
      <select
        value={batteryKwh}
        onChange={(e) => handleKwhChange(Number(e.target.value))}
        style={SELECT_STYLE}
        aria-label="Battery capacity"
      >
        {BATTERY_KWH_OPTIONS.map((o) => (
          <option key={o.kwh} value={o.kwh}>{o.label}</option>
        ))}
      </select>

      {/* Type dropdown */}
      <select
        value={batteryType}
        onChange={(e) => setBatteryType(e.target.value as "lifepo4" | "lead-acid")}
        disabled={!batteryOn}
        style={{ ...SELECT_STYLE, opacity: batteryOn ? 1 : 0.45 }}
        aria-label="Battery chemistry"
      >
        {BATTERY_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

    </div>
  );
}

// ─── Grid node controls (FIX 5 + FIX 9) ──────────────────────────────────
function GridNodeControls() {
  const { gridAvailable, setGridAvailable, mode, lang } = useSimStore();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "4px 2px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <CompactToggle
          isOn={gridAvailable}
          onToggle={() => setGridAvailable(!gridAvailable)}
          onColor="#3B82F6"
        />
        <span style={{ fontSize: 10, color: gridAvailable ? "#3B82F6" : "#EF4444", fontWeight: 600 }}>
          {gridAvailable ? L(lang, "gridBijli") : L(lang, "gridOff")}
        </span>
      </div>
      {!gridAvailable && (
        <div style={{ fontSize: 10, color: "#EF444488", lineHeight: 1.2 }}>
          {mode === "on-grid" ? "Solar bhi band" : "Battery backup"}
        </div>
      )}
    </div>
  );
}

// ─── Ghar Drawer — right-side slide-in panel with appliance controls ─────────
// When isPinned=true: no backdrop, no slide animation (renders as docked aside in page.tsx)
// When isPinned=false: floats over diagram with backdrop + spring slide animation
export function GharDrawerContents({
  onClose,
  isPinned,
  onPinToggle,
}: {
  onClose: () => void;
  isPinned: boolean;
  onPinToggle: () => void;
}) {
  const { lang } = useSimStore();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{
          background: "rgba(15, 23, 42, 0.90)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottomColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">{L(lang, "appliancesTitle")}</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Pin / unpin button */}
          <button
            onClick={onPinToggle}
            aria-label={isPinned ? "Unpin drawer" : "Pin drawer to side"}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
              padding: "4px",
              color: isPinned ? "#FACC15" : "#94A3B8",
              transition: "color 0.15s ease",
            }}
          >
            {isPinned ? "📍" : "📌"}
          </button>
          {/* Close button */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-stroke transition-colors text-base font-bold"
            aria-label="Close appliance panel"
          >
            ×
          </button>
        </div>
      </div>

      {/* Body — scrollable appliance grid */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 scrollbar-thin">
        <ApplianceGrid />
      </div>
    </div>
  );
}

function GharDrawer({
  open,
  onClose,
  isPinned,
  onPinToggle,
}: {
  open: boolean;
  onClose: () => void;
  isPinned: boolean;
  onPinToggle: () => void;
}) {
  // When pinned, this floating drawer is not rendered — page.tsx renders the docked aside instead
  if (isPinned) return null;

  return (
    <>
      {/* Backdrop — click outside to close (float mode only) */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="ghar-backdrop"
            className="absolute inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.45)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Drawer panel — spring slide from right */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="ghar-drawer"
            className="absolute top-0 right-0 h-full z-50"
            style={{
              width: 320,
              background: "rgba(15, 23, 42, 0.88)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "-8px 0 40px rgba(0,0,0,0.7)",
            }}
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            <GharDrawerContents
              onClose={onClose}
              isPinned={isPinned}
              onPinToggle={onPinToggle}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function SchematicSVG({
  isMobile = false,
  onMobileGharClick,
}: {
  isMobile?: boolean;
  onMobileGharClick?: () => void;
} = {}) {
  const {
    mode,
    solarW,
    loadW,
    gridImportW,
    gridExportW,
    batteryChargeW,
    batteryDischargeW,
    gridAvailable,
    systemOffline,
    batterySoc,
    inverterOverload,
    solarOn,
    batteryOn,
    gharDrawerOpen,
    gharDrawerPinned,
    setGharDrawerOpen,
    setGharDrawerPinned,
    lang,
  } = useSimStore();

  const openGharDrawer  = useCallback(() => {
    if (isMobile) {
      // On mobile, scroll to the appliances panel below instead of opening floating drawer
      onMobileGharClick?.();
      return;
    }
    setGharDrawerOpen(true);
  }, [isMobile, onMobileGharClick, setGharDrawerOpen]);
  const closeGharDrawer = useCallback(() => setGharDrawerOpen(false), [setGharDrawerOpen]);
  const togglePin       = useCallback(() => setGharDrawerPinned(!gharDrawerPinned), [gharDrawerPinned, setGharDrawerPinned]);

  const showBattery = mode === "off-grid" || mode === "hybrid";
  const showGrid    = mode === "on-grid"  || mode === "hybrid";

  const isGridFail       = !gridAvailable;
  const isOnGridOffline  = mode === "on-grid" && isGridFail;

  const batteryActive   = showBattery && batterySoc > 0 && batteryOn;
  const effectiveSolarW = solarOn ? solarW : 0;

  const socColor = batterySoc >= 0.8 ? "#22C55E"
    : batterySoc >= 0.4 ? "#EAB308"
    : batterySoc >= 0.2 ? "#F97316"
    : "#EF4444";

  return (
    // 40vh container — full width, short height
    <div className="w-full h-full" style={{ position: "relative" }}>
      <svg
        viewBox="0 0 1000 370"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Solar power flow diagram — ${mode} mode`}
      >
        <title>{`Solar power flow diagram — ${mode} mode`}</title>
        <desc>Shows real-time power flow between solar panels, battery, grid, and home load.</desc>

        {/* Background grid lines + neon glow filters */}
        <defs>
          <pattern id="grid-bg" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" strokeWidth="0.5" />
          </pattern>

          {/* Neon glow filters for flow lines */}
          <filter id="glow-yellow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.5" result="blur1" />
            <feGaussianBlur stdDeviation="5" result="blur2" in="SourceGraphic" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-blue" x="-40%" y="-40%" width="180%" height="180%">
            <feColorMatrix type="matrix" values="0 0 0 0 0.23  0 0 0 0 0.51  0 0 0 0 0.96  0 0 0 1 0" result="blue" />
            <feGaussianBlur stdDeviation="3" result="blur" in="blue" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-green" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-orange" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-purple" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-white" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Legacy node glow */}
          <filter id="node-glow-solar" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect width="1000" height="370" fill="url(#grid-bg)" opacity="0.5" />

        {/* ── FLOW LINES (FIX 6: arrowheads via PowerFlowLine) ── */}

        {/* Solar → Inverter */}
        <PowerFlowLine
          pathD={PATHS.solar}
          powerW={isOnGridOffline || !solarOn ? 0 : effectiveSolarW}
          flowType="solar"
          isActive={effectiveSolarW > 0 && !isOnGridOffline && solarOn}
        />
        <ParticleStream
          pathD={PATHS.solar}
          powerW={isOnGridOffline || !solarOn ? 0 : effectiveSolarW}
          flowType="solar"
          isActive={effectiveSolarW > 0 && !isOnGridOffline && solarOn}
        />

        {/* Grid Import: Grid → Inverter */}
        {showGrid && (
          <>
            <PowerFlowLine
              pathD={PATHS.gridImport}
              powerW={gridImportW}
              flowType="grid-import"
              isActive={gridImportW > 0 && gridAvailable}
              gridFail={isGridFail}
            />
            <ParticleStream
              pathD={PATHS.gridImport}
              powerW={gridImportW}
              flowType="grid-import"
              isActive={gridImportW > 0 && gridAvailable}
            />
          </>
        )}

        {/* Grid Export: Inverter → Grid */}
        {showGrid && (
          <>
            <PowerFlowLine
              pathD={PATHS.gridExport}
              powerW={gridExportW}
              flowType="grid-export"
              isActive={gridExportW > 0 && gridAvailable}
              gridFail={isGridFail}
            />
            <ParticleStream
              pathD={PATHS.gridExport}
              powerW={gridExportW}
              flowType="grid-export"
              isActive={gridExportW > 0 && gridAvailable}
            />
          </>
        )}

        {/* Battery Charge: Inverter → Battery */}
        {showBattery && (
          <>
            <PowerFlowLine
              pathD={PATHS.batteryCharge}
              powerW={batteryOn ? batteryChargeW : 0}
              flowType="battery-charge"
              isActive={batteryChargeW > 0 && batteryOn}
            />
            <ParticleStream
              pathD={PATHS.batteryCharge}
              powerW={batteryOn ? batteryChargeW : 0}
              flowType="battery-charge"
              isActive={batteryChargeW > 0 && batteryOn}
            />
          </>
        )}

        {/* Battery Discharge: Battery → Inverter */}
        {showBattery && (
          <>
            <PowerFlowLine
              pathD={PATHS.batteryDisch}
              powerW={batteryOn ? batteryDischargeW : 0}
              flowType="battery-discharge"
              isActive={batteryDischargeW > 0 && batteryOn}
            />
            <ParticleStream
              pathD={PATHS.batteryDisch}
              powerW={batteryOn ? batteryDischargeW : 0}
              flowType="battery-discharge"
              isActive={batteryDischargeW > 0 && batteryOn}
            />
          </>
        )}

        {/* Inverter → Ghar/Load */}
        <PowerFlowLine
          pathD={PATHS.load}
          powerW={isOnGridOffline ? 0 : loadW}
          flowType="load"
          isActive={!systemOffline && loadW > 0}
        />
        <ParticleStream
          pathD={PATHS.load}
          powerW={isOnGridOffline ? 0 : loadW}
          flowType="load"
          isActive={!systemOffline && loadW > 0}
        />

        {/* ── FLOW WATT LABELS — pill background + colored text ── */}

        {/* Solar → Inverter label (bezier midpoint ≈ 293,118, label ABOVE at y=104) */}
        {effectiveSolarW > 0 && !isOnGridOffline && solarOn && (
          <g className="pointer-events-none">
            <rect x={233} y={93} width={120} height={16} rx={8} fill="rgba(0,0,0,0.55)" stroke="#F6C90E" strokeWidth={0.5} />
            <text x={293} y={104} textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, sans-serif">
              <tspan fill="#F6C90E" fontSize="10" fontWeight="600">{Math.round(effectiveSolarW)}W</tspan>
              <tspan dx="5" fill="#6EE7B7" fontSize="9">{(effectiveSolarW / 1000).toFixed(1)}kWh</tspan>
              <tspan dx="5" fill="#FDE68A" fontSize="9">₹{Math.round(effectiveSolarW / 1000 * 6.5)}/hr</tspan>
            </text>
          </g>
        )}

        {/* Grid Import label */}
        {showGrid && gridImportW > 0 && gridAvailable && (
          <g className="pointer-events-none">
            <rect x={233} y={183} width={120} height={16} rx={8} fill="rgba(0,0,0,0.55)" stroke="#3B82F6" strokeWidth={0.5} />
            <text x={293} y={194} textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, sans-serif">
              <tspan fill="#60A5FA" fontSize="10" fontWeight="600">{Math.round(gridImportW)}W</tspan>
              <tspan dx="5" fill="#6EE7B7" fontSize="9">{(gridImportW / 1000).toFixed(1)}kWh</tspan>
              <tspan dx="5" fill="#FDE68A" fontSize="9">₹{Math.round(gridImportW / 1000 * 6.5)}/hr</tspan>
            </text>
          </g>
        )}

        {/* Grid Export label */}
        {showGrid && gridExportW > 0 && gridAvailable && (
          <g className="pointer-events-none">
            <rect x={233} y={183} width={120} height={16} rx={8} fill="rgba(0,0,0,0.55)" stroke="#A855F7" strokeWidth={0.5} />
            <text x={293} y={194} textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, sans-serif">
              <tspan fill="#C084FC" fontSize="10" fontWeight="600">{Math.round(gridExportW)}W</tspan>
              <tspan dx="5" fill="#6EE7B7" fontSize="9">{(gridExportW / 1000).toFixed(1)}kWh</tspan>
              <tspan dx="5" fill="#FDE68A" fontSize="9">₹{Math.round(gridExportW / 1000 * 6.5)}/hr</tspan>
            </text>
          </g>
        )}

        {/* Battery Charge label */}
        {showBattery && batteryChargeW > 0 && batteryOn && (
          <g className="pointer-events-none">
            <rect x={490} y={127} width={120} height={16} rx={8} fill="rgba(0,0,0,0.55)" stroke="#22C55E" strokeWidth={0.5} />
            <text x={550} y={138} textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, sans-serif">
              <tspan fill="#34D399" fontSize="10" fontWeight="600">{Math.round(batteryChargeW)}W</tspan>
              <tspan dx="5" fill="#6EE7B7" fontSize="9">{(batteryChargeW / 1000).toFixed(1)}kWh</tspan>
              <tspan dx="5" fill="#FDE68A" fontSize="9">₹{Math.round(batteryChargeW / 1000 * 6.5)}/hr</tspan>
            </text>
          </g>
        )}

        {/* Battery Discharge label */}
        {showBattery && batteryDischargeW > 0 && batteryOn && (
          <g className="pointer-events-none">
            <rect x={490} y={129} width={120} height={16} rx={8} fill="rgba(0,0,0,0.55)" stroke="#F97316" strokeWidth={0.5} />
            <text x={550} y={140} textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, sans-serif">
              <tspan fill="#FB923C" fontSize="10" fontWeight="600">{Math.round(batteryDischargeW)}W</tspan>
              <tspan dx="5" fill="#6EE7B7" fontSize="9">{(batteryDischargeW / 1000).toFixed(1)}kWh</tspan>
              <tspan dx="5" fill="#FDE68A" fontSize="9">₹{Math.round(batteryDischargeW / 1000 * 6.5)}/hr</tspan>
            </text>
          </g>
        )}

        {/* Load (Inverter→Ghar) label */}
        {!systemOffline && loadW > 0 && !isOnGridOffline && (
          <g className="pointer-events-none">
            <rect x={600} y={326} width={120} height={16} rx={8} fill="rgba(0,0,0,0.55)" stroke="#F8FAFC" strokeWidth={0.5} />
            <text x={660} y={337} textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, sans-serif">
              <tspan fill="#E2E8F0" fontSize="10" fontWeight="600">{Math.round(loadW)}W</tspan>
              <tspan dx="5" fill="#6EE7B7" fontSize="9">{(loadW / 1000).toFixed(1)}kWh</tspan>
              <tspan dx="5" fill="#FDE68A" fontSize="9">₹{Math.round(loadW / 1000 * 6.5)}/hr</tspan>
            </text>
          </g>
        )}

        {/* ── COMPONENT NODES ── */}

        {/* COL-1 TOP: Solar Panels — cx=110, cy=85, controlsHeight=60 */}
        <motion.g
          initial={{ opacity: 0, scale: 0.7, x: -20 }}
          animate={{ opacity: solarOn ? 1 : 0.45, scale: 1, x: 0 }}
          transition={{ delay: 0, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <ComponentNode
            cx={110} cy={85}
            label={L(lang, "solarPanels")}
            subvalue={solarOn ? `${Math.round(effectiveSolarW)} W` : "0 W (OFF)"}
            iconType="sun"
            glowColor={solarOn ? "#F6C90E" : "#475569"}
            isActive={effectiveSolarW > 0 && !isOnGridOffline && solarOn}
            tooltip="Suraj ki roshni → bijli. Jitni dhoop, utni bijli."
            controls={<SolarNodeControls />}
            controlsHeight={60}
          />
        </motion.g>

        {/* COL-1 BOTTOM: UPPCL Grid — cx=110, cy=265, controlsHeight=50 */}
        <AnimatePresence mode="wait">
          {showGrid && (
            <motion.g
              key={`grid-${mode}`}
              initial={{ opacity: 0, scale: 0.6, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ delay: 0.1, duration: 0.3, ease: "easeInOut" }}
            >
              <ComponentNode
                cx={110} cy={265}
                label={L(lang, "grid")}
                subvalue={gridAvailable ? L(lang, "gridAvail") : L(lang, "gridOff")}
                iconType="plug"
                glowColor={gridAvailable ? "#3B82F6" : "#EF4444"}
                isActive={gridAvailable}
                danger={!gridAvailable}
                tooltip="UPPCL grid connection. Toggle to simulate power cut."
                controls={<GridNodeControls />}
                controlsHeight={50}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* COL-2 CENTER: Hybrid Inverter — cx=430, cy=150, no controls */}
        {/* AnimatePresence key on mode triggers a quick flash when mode switches */}
        <AnimatePresence mode="wait">
          <motion.g
            key={`inverter-${mode}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {/* Mode-change flash ring */}
            <motion.circle
              cx={430} cy={150} r={38}
              fill="none"
              stroke={inverterOverload ? "#EF4444" : mode === "on-grid" ? "#3B82F6" : mode === "off-grid" ? "#22C55E" : "#06B6D4"}
              strokeWidth={2}
              initial={{ opacity: 0.9, r: 30 }}
              animate={{ opacity: 0, r: 60 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            <ComponentNode
              cx={430} cy={150}
              label={
                mode === "on-grid"
                  ? L(lang, "onGrid") + (lang === "en" ? " Inverter" : " इन्वर्टर")
                  : mode === "off-grid"
                  ? L(lang, "offGrid") + (lang === "en" ? " Inverter" : " इन्वर्टर")
                  : L(lang, "inverter")
              }
              subvalue={inverterOverload ? "OVERLOAD!" : `${(useSimStore.getState().inverterWatts / 1000).toFixed(1)} kW`}
              iconType="zap"
              glowColor={inverterOverload ? "#EF4444" : mode === "on-grid" ? "#60A5FA" : mode === "off-grid" ? "#34D399" : "#22D3EE"}
              isActive={!systemOffline}
              danger={inverterOverload}
              tooltip="DC→AC conversion. Handles all loads in your home."
            />
          </motion.g>
        </AnimatePresence>

        {/* COL-3 CENTER: Battery — cx=670, cy=150, controlsHeight=90 */}
        <AnimatePresence mode="wait">
          {showBattery && (
            <motion.g
              key={`battery-${mode}`}
              initial={{ opacity: 0, scale: 0.6, x: 20 }}
              animate={{ opacity: batteryOn ? 1 : 0.45, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ delay: 0.2, duration: 0.3, ease: "easeInOut" }}
            >
              <ComponentNode
                cx={670} cy={150}
                label={L(lang, "battery")}
                subvalue={batteryOn && useSimStore.getState().batteryKwh > 0
                  ? `${Math.round(batterySoc * 100)}%`
                  : batteryOn ? "No Battery" : "Disabled"}
                iconType="battery"
                glowColor={batteryOn ? socColor : "#475569"}
                isActive={batteryActive}
                socPercent={batteryOn && useSimStore.getState().batteryKwh > 0 ? batterySoc : 0}
                isCharging={batteryChargeW > 0 && batteryOn}
                tooltip="Charges in the day, powers your home at night or during cuts."
                controls={<BatteryNodeControls />}
                controlsHeight={147}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* COL-4 RIGHT: Ghar (Load) — cx=890, cy=150, clickable → opens appliance drawer */}
        <motion.g
          initial={{ opacity: 0, scale: 0.7, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          onClick={openGharDrawer}
          style={{ cursor: "pointer" }}
          role="button"
          aria-label="Open appliance panel"
        >
          <ComponentNode
            cx={890} cy={150}
            label={L(lang, "gharLoad")}
            subvalue={`${Math.round(loadW)} W`}
            iconType="house"
            glowColor="#F1F5F9"
            isActive={!systemOffline}
            tooltip="Tap to manage appliances"
          />
          {/* Per-hour kWh and cost line — below watt value, above tap hint */}
          <text
            x={890} y={178}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#64748B"
            fontSize="9"
            fontFamily="Inter, sans-serif"
            className="pointer-events-none select-none"
          >
            {`~${(loadW / 1000).toFixed(2)}kWh | ${fmtRs((loadW / 1000) * 6.50)}${L(lang, "perHour")}`}
          </text>
          {/* Tap hint — below node */}
          <text
            x={890} y={193}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#475569"
            fontSize="9"
            fontFamily="Inter, sans-serif"
            className="pointer-events-none select-none"
          >
            ☰ Appliances
          </text>
        </motion.g>

        {/* On-Grid grid-fail blackout overlay */}
        {isOnGridOffline && (
          <motion.rect
            x={0} y={0} width={1000} height={370}
            fill="#000000"
            pointerEvents="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.7, 0.7, 0.4] }}
            transition={{ duration: 1.2, times: [0, 0.15, 0.6, 1] }}
          />
        )}
      </svg>

      {/* Mode label badge */}
      <div
        className="absolute top-2 left-2 px-2 py-1 rounded-md bg-surface-card/80 border border-surface-stroke text-xs text-text-secondary font-mono"
        style={{ pointerEvents: "none" }}
      >
        {mode.toUpperCase()} MODE
      </div>

      {/* Ghar Appliance Drawer — float mode only (pinned mode renders in DiagramLayout as docked aside)
          Suppressed on mobile — appliances are always visible below the diagram */}
      {!isMobile && (
        <GharDrawer
          open={gharDrawerOpen}
          onClose={closeGharDrawer}
          isPinned={gharDrawerPinned}
          onPinToggle={togglePin}
        />
      )}
    </div>
  );
}
