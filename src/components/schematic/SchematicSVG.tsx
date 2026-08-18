"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSimStore } from "@/store/simulation-store";
import { calcBackupHours, LOW_SOC_CUTOFF } from "@/lib/simulation";
import { PowerFlowLine } from "./PowerFlowLine";
import { ParticleStream } from "./ParticleStream";
import { ComponentNode } from "./ComponentNode";
import { OverloadWatcher } from "./OverloadWatcher";
import { ApplianceGrid } from "@/components/controls/ApplianceGrid";
import { RealSetupNameplate } from "@/components/RealSetupNameplate";
import { L } from "@/lib/i18n";
import { fmtRs } from "@/lib/tariff";
import {
  PCU_CAP_W,
  PCU_EFF,
  NAMEPLATE,
} from "@/lib/realSetup";
import type { PcuMode, OverloadBand } from "@/lib/types";

// ─── PCU-mode badge initials (Real Setup — inverter node badge) ────────────
const PCU_MODE_BADGE: Record<PcuMode, string> = {
  pcu: "PCU",
  smart: "SMART",
  "hybrid-pcu": "HYBRID",
  "grid-export": "G-EXP",
};

/** House-node ring level derived from overloadBand + the latched trip state. */
function getNodeOverloadLevel(
  band: OverloadBand,
  tripped: boolean
): "none" | "amber" | "red" | "tripped" {
  if (tripped) return "tripped";
  if (band === "amber") return "amber";
  if (band === "red" || band === "critical") return "red";
  return "none";
}

// ─── Layout (viewBox 0 0 1000 370) — pure LEFT-TO-RIGHT pipeline ──────────────
//
// COLUMN 1 (LEFT)    COLUMN 2 (CENTER)    COLUMN 3           COLUMN 4 (RIGHT)
//                                          (CENTER-RIGHT)
// [Solar Panels]  →
//                 →  [Hybrid Inverter]  ↔  [Battery]     →  [Ghar / Load]
// [UPPCL Grid]    →
//
// GATE-2 round-3 (Rajat: "flow lines cross card content") — node heights
// change per-mode (controlsHeight varies with isRealSetup/simView), so no
// anchor below is ever a hardcoded constant anymore. Every path endpoint is
// derived from `rectOf(cx, cy, controlsHeight)` computed at render time from
// the SAME controlsHeight value passed into that node's <ComponentNode>, so
// a path can never drift out of sync with what's actually on screen.
//
// Node geometry (NODE_W=150, NODE_H_BASE=70, see rectOf() below):
//   Solar:    cx=110, cy=85,  controlsH=SOLAR_CONTROLS_H
//   Grid:     cx=110, cy=265, controlsH=GRID_CONTROLS_H
//   Inverter: cx=430, cy=150, controlsH=INVERTER_CONTROLS_H (mode-dependent)
//   Battery:  cx=670, cy=150, controlsH=BATTERY_CONTROLS_H
//   Ghar:     cx=890, cy=150, controlsH=GHAR_CONTROLS_H
//
// Flow paths (node-edge to node-edge, curve control points at x=300 are pure
// bezier shaping — not anchors, always mid-way regardless of node height):
//   Solar    → Inverter : solar.right,solar.cy    C 300,cy  300,cy  inverter.left,inverter.cy
//   Grid     → Inverter : grid.right,grid.cy      C 300,cy  300,cy  inverter.left,inverter.cy
//   Inverter → Battery  : inverter.right,cy  L  battery.left,cy      (horizontal)
//   Battery  → Inverter : battery.left,cy+4  L  inverter.right,cy+4 (horizontal, offset)
//   Inverter → Ghar     : inverter.cx,inverter.bottom L …350… L ghar.cx,ghar.bottom

const NODE_W = 150;
const NODE_H_BASE = 70;

/** Actual on-screen rect of a ComponentNode, from the SAME cx/cy/controlsHeight it renders with. */
function rectOf(cx: number, cy: number, controlsHeight: number) {
  const h = NODE_H_BASE + controlsHeight;
  return {
    cx,
    cy,
    left: cx - NODE_W / 2,
    right: cx + NODE_W / 2,
    top: cy - h / 2,
    bottom: cy + h / 2,
  };
}

// ─── Solar capacity presets ────────────────────────────────────────────────
const SOLAR_KWP_OPTIONS = [
  { label: "2 kWp",   kwp: 2   },
  { label: "3.6 kWp", kwp: 3.6 },
  { label: "4.4 kWp", kwp: 4.4 },
  { label: "5 kWp",   kwp: 5   },
  { label: "7 kWp",   kwp: 7   },
  { label: "10 kWp",  kwp: 10  },
];

// ─── Inverter capacity presets (watts) ─────────────────────────────────────
const INVERTER_W_OPTIONS = [
  { label: "3 kW",   watts: 3000  },
  { label: "5 kW",   watts: 5000  },
  { label: "6.2 kW", watts: 6200  },
  { label: "10 kW",  watts: 10000 },
];

// ─── Battery capacity presets ──────────────────────────────────────────────
// 7.2 kWh = a real 4×150Ah@12V lead-acid bank in series (48V × 150Ah ÷ 1000)
const BATTERY_KWH_OPTIONS = [
  { label: "5 kWh",   kwh: 5   },
  { label: "7.2 kWh", kwh: 7.2 },
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
function SolarNodeControls({ isMobile = false }: { isMobile?: boolean }) {
  const { solarOn, toggleSolar, panelKwp, setPanelKwp, lang, simView, curtailedW, netMeterInstalled } = useSimStore();
  const isRealSetup = simView === "real-setup";
  // LEAD-2 (code review): surplus solar that's neither served, charged, nor
  // exported is silently wasted — surface it here instead of letting it
  // vanish from the numbers.
  // GATE-1 mobile: the curtailment story is fully carried by the ticker on
  // mobile (see RealSetupTicker) — the node card only has room for the
  // toggle + capacity line at the tiny effective on-screen text size.
  const showCurtailed = isRealSetup && curtailedW > 1 && !isMobile;

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

      {/* Capacity — fixed nameplate value in Real Setup (as-built 4.8 kWp), editable dropdown in Learn */}
      {isRealSetup ? (
        <div style={{ ...SELECT_STYLE, cursor: "default", opacity: solarOn ? 1 : 0.45 }}>
          {NAMEPLATE.module.countPerConnection} × 600W = {panelKwp} kWp
        </div>
      ) : (
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
      )}

      {/* Info line — hidden on mobile Real Setup to hold the max-2-line
          budget (the array size is already in the System Nameplate panel). */}
      {!(isMobile && isRealSetup) && (
        <div style={{ fontSize: 10, color: solarOn ? "#F6C90E88" : "#47556977", lineHeight: 1 }}>
          {solarOn ? `~${(panelKwp * 4.5).toFixed(0)} kWh/day` : "Disconnected"}
        </div>
      )}

      {/* Curtailment pill (LEAD-2 / GATE-1) — compact single line so it never
          wraps or touches the card border; the full "why" (enable net-meter
          to export) is a title tooltip here + surfaced in the ticker instead
          of being crammed into the node card. */}
      {showCurtailed && (
        <div
          title={!netMeterInstalled ? L(lang, "curtailedHint") : undefined}
          style={{
            fontSize: 10,
            color: "#FB923C",
            lineHeight: 1,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          ⚠ {(curtailedW / 1000).toFixed(2)} kW {L(lang, "curtailedChip").toLowerCase()}
        </div>
      )}
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
// Nameplate bank voltage (same as simulation.ts) — used to derive Ah from kWh
const VOLTAGE: Record<"lifepo4" | "lead-acid", number> = {
  lifepo4: 51.2,
  "lead-acid": 48,
};
const INVERTER_EFF = 0.95;

// ─── Format hours → "2h 15m" or "45m" ───────────────────────────────────
function fmtHours(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

// ─── Battery node controls (FIX 4 + FIX 5 + FIX 10) ──────────────────────
// GATE-2 round-3 (Rajat: "battery box has TWO bars, keep ONE") — the SoC bar
// itself (with its interactive range input overlaid) now lives INSIDE
// ComponentNode's own built-in bar (socEditable prop, wired from the
// <ComponentNode> call below in SchematicSVG). This component only renders
// the toggle/lock/time-estimate/spec text that sits BELOW that one bar.
function BatteryNodeControls({ isMobile = false }: { isMobile?: boolean }) {
  const {
    batteryKwh, setBatteryKwh,
    batteryType, setBatteryType,
    batteryOn, toggleBattery,
    batterySoc,
    loadW,
    gridAvailable,
    socLocked, setSocLocked,
    lang,
    simView,
  } = useSimStore();
  const isRealSetup = simView === "real-setup";
  // Transformer-based UGE5048 is ~90% efficient (vs the generic 0.95 used by Learn mode).
  const effInUse = isRealSetup ? PCU_EFF : INVERTER_EFF;

  const handleKwhChange = (kwh: number) => {
    setBatteryKwh(kwh);
  };

  // R5 (code review): lead-acid in Real Setup has a hard 50% DoD floor —
  // "backup hours" must be measured from the usable band ABOVE that floor,
  // not from the raw SoC, or it visibly claims hours of backup right at the
  // point the battery is actually empty (soc === lowCutoff).
  const isRealSetupLeadAcid = isRealSetup && batteryType === "lead-acid";
  const lowCutoff = LOW_SOC_CUTOFF[batteryType];
  const socAboveFloor = isRealSetupLeadAcid ? Math.max(0, batterySoc - lowCutoff) : batterySoc;
  const backupHrs = batteryOn && batteryKwh > 0
    ? calcBackupHours(socAboveFloor, batteryKwh, batteryType, loadW, effInUse)
    : 0;
  const backupDisplay = batteryOn && batteryKwh > 0
    ? backupHrs > 24 ? "24+ hr" : `${backupHrs.toFixed(1)} hr`
    : "—";

  const socColor = isRealSetupLeadAcid
    ? batterySoc <= 0.5 ? "#EF4444" : batterySoc <= 0.65 ? "#F97316" : batterySoc <= 0.8 ? "#EAB308" : "#22C55E"
    : batterySoc >= 0.8 ? "#22C55E"
      : batterySoc >= 0.4 ? "#EAB308"
      : batterySoc >= 0.2 ? "#F97316"
      : "#EF4444";

  // Time estimates — always based on battery spec (max C-rate), not variable solar/grid watts
  const usableWh = batteryKwh * DOD_FACTOR[batteryType] * effInUse * 1000;
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

  // Ah → kWh relatable breakdown (mirrors simulation.ts DOD × inverter-eff usable model)
  const bankVoltage = VOLTAGE[batteryType];
  const bankAh = Math.round((batteryKwh * 1000) / bankVoltage);
  const usableKwh = usableWh / 1000;
  const dodPct = Math.round(DOD_FACTOR[batteryType] * 100);
  // GATE-2 round-3 (Rajat: "spec shown TWICE — pill + 2 grey lines"): the
  // pill just above ("{kwh} kWh — {NAMEPLATE.battery.name}") already states
  // the full bank spec (kWh, Ah×count, voltage, chemistry) in Real Setup, so
  // the old first breakdown line duplicated it verbatim. Kept to exactly ONE
  // line — the one number the pill does NOT carry: usable capacity after DoD.
  const ahBreakdownLines: string[] = batteryKwh <= 0
    ? []
    : batteryType === "lead-acid"
      // 48V lead-acid bank = 4 × 12V batteries in series, so bank Ah = single-battery Ah
      ? isRealSetup
        ? [lang === "hi"
            ? `≈${usableKwh.toFixed(1)} kWh उपयोग AC · ${dodPct}% DoD`
            : `≈${usableKwh.toFixed(1)} kWh usable AC · ${dodPct}% DoD`]
        : [`${batteryKwh} kWh = 4×${bankAh}Ah@12V — usable ~${usableKwh.toFixed(1)} kWh @ ${dodPct}% DoD`]
      : [`${batteryKwh} kWh = ${bankAh}Ah@${bankVoltage}V LFP — usable ~${usableKwh.toFixed(1)} kWh @ ${dodPct}% DoD`];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "4px 2px 0", height: "100%" }}>
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

      {/* GATE-2 round-3 (Rajat: "one bar, not two") — the SoC bar + its
          interactive slider now live on the CARD itself (ComponentNode's
          built-in bar, made interactive via socEditable). This row only
          keeps the manual/auto lock (a tiny text button) beside the
          time-estimate — no bar here anymore. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
        <button
          onClick={() => setSocLocked(!socLocked)}
          aria-label={socLocked ? "Unlock SoC (let simulation update)" : "Lock SoC (manual control)"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            fontSize: 9,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
            lineHeight: 1,
            color: socLocked ? "#F6C90E" : "#64748B",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 10 }}>{socLocked ? "🔒" : "🔓"}</span>
          {socLocked ? L(lang, "manual") : L(lang, "auto")}
        </button>
        {/* Time estimate — hidden on mobile Real Setup (GATE-1 max-2-line budget) */}
        {!(isMobile && isRealSetup) && (
          <span style={{ fontSize: 9, color: "#94A3B8", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {batteryOn && batteryKwh > 0 ? timeEstimate : "— No battery"}
          </span>
        )}
      </div>

      {/* Capacity + chemistry — fixed as-built nameplate in Real Setup, editable
          in Learn. Hidden on mobile Real Setup — the exact same bank spec is
          already in the System Nameplate panel below the diagram. */}
      {isRealSetup ? (
        !isMobile && (
          <div style={{ ...SELECT_STYLE, cursor: "default" }}>
            {batteryKwh} kWh — {NAMEPLATE.battery.name}
          </div>
        )
      ) : (
        <>
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
        </>
      )}

      {/* Ah → kWh relatable breakdown — max 2 short lines, sized to fit the
          card. Hidden on mobile Real Setup — same numbers live in the
          System Nameplate panel below the diagram (GATE-1 max-2-line budget). */}
      {ahBreakdownLines.length > 0 && !(isMobile && isRealSetup) && (
        <div style={{ fontSize: 10, color: "#64748B", lineHeight: 1.3 }}>
          {ahBreakdownLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

    </div>
  );
}

// ─── Grid node controls (FIX 5 + FIX 9) ──────────────────────────────────
function GridNodeControls() {
  const { gridAvailable, setGridAvailable, mode, simView, lang } = useSimStore();
  const isRealSetup = simView === "real-setup";

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
          {isRealSetup ? "Battery backup (PCU se)" : mode === "on-grid" ? "Solar bhi band" : "Battery backup"}
        </div>
      )}
    </div>
  );
}

// ─── Inverter node controls — capacity selector (always-on, no switch) ──────
function InverterNodeControls({ isMobile = false }: { isMobile?: boolean }) {
  const { inverterWatts, setInverterWatts, gridAvailable, mode, simView, pcuMode, overloadBand, lang } = useSimStore();

  if (simView === "real-setup") {
    // GATE-2 round-3 (Rajat: "grey block low-contrast + too long"). Max 2
    // lines total, both ≥4.5:1 contrast (#CBD5E1 measures ~12:1 against this
    // card's dark background — see contrast note below):
    //   line 1: mode badge + battery-mode cap (unchanged role, shortened text
    //            so it fits on ONE line instead of wrapping to two)
    //   line 2: mains rating + efficiency, OR the overload alert when active
    // The priority-chain (day/night arrows) is dropped here entirely — it
    // already lives in the ModeSidebar PCU-mode chips (PriorityChain), so
    // this was pure duplication, not new information, and duplicating it
    // was the reason this card needed 3 lines / ~108px in the first place.
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "4px 2px 0", height: "100%" }}>
        <div style={{ ...SELECT_STYLE, cursor: "default", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {PCU_MODE_BADGE[pcuMode]} · {(PCU_CAP_W / 1000).toFixed(1)}kW {L(lang, "nameplateCapShort")}
        </div>
        {/* GATE-1 mobile (Rajat: node text unreadable at 375px — the SVG's
            foreignObject text is scaled DOWN by the viewBox-to-viewport
            ratio). Only show the overload alert (safety-critical) on mobile;
            the efficiency line is already duplicated in the System Nameplate
            panel below the diagram. */}
        {(!isMobile || overloadBand !== "none") && (
          <div style={{ fontSize: 10, color: overloadBand !== "none" ? "#EF4444" : "#CBD5E1", lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {overloadBand === "none"
              ? `${NAMEPLATE.pcu.mainsRating} · ${NAMEPLATE.pcu.efficiency} ${L(lang, "effAbbrev")}`
              : overloadBand === "amber"
                ? L(lang, "overloadAmber")
                : L(lang, "overloadRed")}
          </div>
        )}
      </div>
    );
  }

  // Overload only bites when grid can't backstop (off-grid, or grid-fail in hybrid/on-grid)
  const gridCanBackstop = gridAvailable && (mode === "on-grid" || mode === "hybrid");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "4px 2px 0", height: "100%" }}>
      <select
        value={inverterWatts}
        onChange={(e) => setInverterWatts(Number(e.target.value))}
        style={SELECT_STYLE}
        aria-label="Inverter rated capacity"
      >
        {INVERTER_W_OPTIONS.map((o) => (
          <option key={o.watts} value={o.watts}>{o.label}</option>
        ))}
      </select>
      <div style={{ fontSize: 9, color: "#64748B", lineHeight: 1.25 }}>
        {gridCanBackstop
          ? "Rated capacity — grid backs up any overload"
          : `Load above ${(inverterWatts / 1000).toFixed(1)} kW trips it (no grid backstop)`}
      </div>
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
  const { lang, simView } = useSimStore();

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

      {/* Body — scrollable appliance grid (+ System Nameplate in Real Setup, Section E) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 scrollbar-thin flex flex-col gap-3">
        <ApplianceGrid />
        {simView === "real-setup" && <RealSetupNameplate />}
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

// ─── Ghar node controls (GATE-2 round-3) ─────────────────────────────────
// Rajat: the "☰ Appliances" tap hint used to be a free-floating pill drawn
// BELOW the node's own card rect — it sat directly on top of the
// Inverter→Ghar flow line's vertical run. Moving it INSIDE the card (as a
// normal controls foreignObject, same idiom every other node uses) fixes
// this at the source: the node's own rect grows to include it, so the flow
// line's dynamically-computed anchor (ghar.bottom, see rectOf() below)
// automatically clears it — no separate occlusion pill needed.
function GharNodeControls() {
  const { lang } = useSimStore();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "2px 2px 0",
      }}
    >
      <span style={{ fontSize: 9, color: "#64748B", fontWeight: 500 }}>
        {L(lang, "gharApplianceHint")}
      </span>
    </div>
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
    setBatterySoc,
    batteryKwh,
    setSocLocked,
    inverterOverload,
    solarOn,
    batteryOn,
    gharDrawerOpen,
    gharDrawerPinned,
    setGharDrawerOpen,
    setGharDrawerPinned,
    lang,
    simView,
    pcuMode,
    pcuTripped,
    overloadBand,
    overloadRemainingSec,
  } = useSimStore();
  const isRealSetup = simView === "real-setup";

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

  // Real Setup — House No. 89 always has solar + battery + grid on both
  // connections (real topology, not a Learn-mode architecture toggle).
  const showBattery = isRealSetup ? true : mode === "off-grid" || mode === "hybrid";
  const showGrid    = isRealSetup ? true : mode === "on-grid"  || mode === "hybrid";

  const isGridFail       = !gridAvailable;
  // Anti-islanding blackout flash is a Learn on-grid-only concept — Real Setup's
  // grid-fail handling is expressed inside runPcuSimulation's own status/offline logic.
  const isOnGridOffline  = !isRealSetup && mode === "on-grid" && isGridFail;

  const houseOverloadLevel = isRealSetup ? getNodeOverloadLevel(overloadBand, pcuTripped) : "none";

  const batteryActive   = showBattery && batterySoc > 0 && batteryOn;
  const effectiveSolarW = solarOn ? solarW : 0;

  const socColor = batterySoc >= 0.8 ? "#22C55E"
    : batterySoc >= 0.4 ? "#EAB308"
    : batterySoc >= 0.2 ? "#F97316"
    : "#EF4444";

  // ── GATE-2 round-3: real node geometry, single source of truth ──────────
  // These are the SAME controlsHeight values passed to each <ComponentNode>
  // below — reused here so rectOf() always describes what's actually on
  // screen, never a guess. See the PATHS comment block above rectOf().
  const SOLAR_CONTROLS_H    = 94;
  const GRID_CONTROLS_H     = 50;
  // Real Setup's 3-line block was cut to 2 lines (contrast fix + dropped the
  // sidebar-duplicated priority chain) so it now needs the same height as Learn.
  const INVERTER_CONTROLS_H = 60;
  // Learn mode renders 2 <select> dropdowns + 1 breakdown line (more content
  // than Real Setup's fixed nameplate pill) — measured via the overlap-check
  // script's (c) foreignObject-overflow check (scrollHeight vs clientHeight),
  // not guessed.
  const BATTERY_CONTROLS_H  = 136;
  const GHAR_CONTROLS_H     = 22;

  const solarRect    = rectOf(110, 85,  SOLAR_CONTROLS_H);
  const gridRect     = rectOf(110, 265, GRID_CONTROLS_H);
  const inverterRect = rectOf(430, 150, INVERTER_CONTROLS_H);
  const batteryRect  = rectOf(670, 150, BATTERY_CONTROLS_H);
  const gharRect     = rectOf(890, 150, GHAR_CONTROLS_H);

  const paths = {
    solar:         `M ${solarRect.right} ${solarRect.cy} C 300 ${solarRect.cy} 300 ${inverterRect.cy} ${inverterRect.left} ${inverterRect.cy}`,
    gridImport:    `M ${gridRect.right} ${gridRect.cy} C 300 ${gridRect.cy} 300 ${inverterRect.cy} ${inverterRect.left} ${inverterRect.cy}`,
    gridExport:    `M ${inverterRect.left + 5} ${inverterRect.cy + 4} C 300 ${inverterRect.cy + 4} 300 ${gridRect.cy} ${gridRect.right} ${gridRect.cy}`,
    batteryCharge: `M ${inverterRect.right} ${inverterRect.cy} L ${batteryRect.left} ${batteryRect.cy}`,
    batteryDisch:  `M ${batteryRect.left} ${batteryRect.cy + 4} L ${inverterRect.right} ${inverterRect.cy + 4}`,
    load:          `M ${inverterRect.cx} ${inverterRect.bottom} L ${inverterRect.cx} 350 L ${gharRect.cx} 350 L ${gharRect.cx} ${gharRect.bottom}`,
  };

  const modeLabel = isRealSetup ? `REAL SETUP — ${PCU_MODE_BADGE[pcuMode]} MODE` : `${mode.toUpperCase()} MODE`;

  // ── GATE-2 round-3 (Rajat: mode pill overlaps Solar node on mobile) ──────
  // Was `absolute top-2 left-2` floating ON TOP of the SVG — on mobile the
  // Solar node's card starts almost at the diagram's own top edge, so the
  // pill sat directly over its corner. Now rendered as a normal shrink-0 flow
  // row ABOVE the diagram box — never overlaps anything, on any width.
  const modeBadge = (
    <div className="shrink-0 px-1 pt-0.5 pb-1" style={{ pointerEvents: "none" }}>
      <span className="inline-block px-2 py-1 rounded-md bg-surface-card/80 border border-surface-stroke text-[10px] text-text-secondary font-mono">
        {modeLabel}
      </span>
    </div>
  );

  // ── GATE-2 round-3 (Rajat: node text unreadable at 375px) ────────────────
  // Below 768px the schematic renders inside a horizontally-scrollable canvas
  // wider than the viewport (MOBILE_SCHEMATIC_MIN_W ≈ viewBox width, i.e.
  // ~1:1 scale) so SVG text keeps its authored px size instead of being
  // crushed by the viewBox→viewport scale ratio (was ~0.375× at 375px,
  // shrinking a "10px" label to ~3.75px on screen). The box still keeps the
  // viewBox's own aspect ratio, so there's no vertical dead space either.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const MOBILE_SCHEMATIC_MIN_W = 1000;
  // Our OWN initial centering scroll (below) fires a native 'scroll' event
  // too — without this guard it immediately hid the swipe hint before the
  // user ever touched the screen, defeating the hint's whole purpose.
  const programmaticScrollRef = useRef(false);

  useEffect(() => {
    if (!isMobile) return;
    const el = scrollRef.current;
    if (!el) return;
    // Initial scroll: center the Inverter node (viewBox cx=430) in the
    // visible viewport — the natural "middle" of the pipeline story.
    const scale = MOBILE_SCHEMATIC_MIN_W / 1000;
    const inverterPx = 430 * scale;
    programmaticScrollRef.current = true;
    el.scrollLeft = Math.max(0, inverterPx - el.clientWidth / 2);
    requestAnimationFrame(() => {
      programmaticScrollRef.current = false;
    });
  }, [isMobile]);

  const handleMobileScroll = useCallback(() => {
    if (programmaticScrollRef.current) return;
    if (showSwipeHint) setShowSwipeHint(false);
  }, [showSwipeHint]);

  const schematicSvg = (
      <svg
        viewBox="0 0 1000 370"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={isRealSetup ? `Real Setup — House No. 89 power flow diagram — ${pcuMode} PCU mode` : `Solar power flow diagram — ${mode} mode`}
      >
        <title>{isRealSetup ? `Real Setup — House No. 89 — ${pcuMode} PCU mode` : `Solar power flow diagram — ${mode} mode`}</title>
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
          pathD={paths.solar}
          powerW={isOnGridOffline || !solarOn ? 0 : effectiveSolarW}
          flowType="solar"
          isActive={effectiveSolarW > 0 && !isOnGridOffline && solarOn}
        />
        <ParticleStream
          pathD={paths.solar}
          powerW={isOnGridOffline || !solarOn ? 0 : effectiveSolarW}
          flowType="solar"
          isActive={effectiveSolarW > 0 && !isOnGridOffline && solarOn}
        />

        {/* Grid Import: Grid → Inverter */}
        {showGrid && (
          <>
            <PowerFlowLine
              pathD={paths.gridImport}
              powerW={gridImportW}
              flowType="grid-import"
              isActive={gridImportW > 0 && gridAvailable}
              gridFail={isGridFail}
            />
            <ParticleStream
              pathD={paths.gridImport}
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
              pathD={paths.gridExport}
              powerW={gridExportW}
              flowType="grid-export"
              isActive={gridExportW > 0 && gridAvailable}
              gridFail={isGridFail}
            />
            <ParticleStream
              pathD={paths.gridExport}
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
              pathD={paths.batteryCharge}
              powerW={batteryOn ? batteryChargeW : 0}
              flowType="battery-charge"
              isActive={batteryChargeW > 0 && batteryOn}
            />
            <ParticleStream
              pathD={paths.batteryCharge}
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
              pathD={paths.batteryDisch}
              powerW={batteryOn ? batteryDischargeW : 0}
              flowType="battery-discharge"
              isActive={batteryDischargeW > 0 && batteryOn}
            />
            <ParticleStream
              pathD={paths.batteryDisch}
              powerW={batteryOn ? batteryDischargeW : 0}
              flowType="battery-discharge"
              isActive={batteryDischargeW > 0 && batteryOn}
            />
          </>
        )}

        {/* Inverter → Ghar/Load */}
        <PowerFlowLine
          pathD={paths.load}
          powerW={isOnGridOffline ? 0 : loadW}
          flowType="load"
          isActive={!systemOffline && loadW > 0}
        />
        <ParticleStream
          pathD={paths.load}
          powerW={isOnGridOffline ? 0 : loadW}
          flowType="load"
          isActive={!systemOffline && loadW > 0}
        />

        {/* ── FLOW WATT LABELS — pill background + colored text ── */}

        {/* Solar → Inverter label (bezier midpoint ≈ 293,118, label ABOVE at y=104) */}
        {effectiveSolarW > 0 && !isOnGridOffline && solarOn && (
          <g className="pointer-events-none" data-flow-label="true" data-flow-type="solar">
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
          <g className="pointer-events-none" data-flow-label="true" data-flow-type="grid-import">
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
          <g className="pointer-events-none" data-flow-label="true" data-flow-type="grid-export">
            <rect x={233} y={183} width={120} height={16} rx={8} fill="rgba(0,0,0,0.55)" stroke="#A855F7" strokeWidth={0.5} />
            <text x={293} y={194} textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, sans-serif">
              <tspan fill="#C084FC" fontSize="10" fontWeight="600">{Math.round(gridExportW)}W</tspan>
              <tspan dx="5" fill="#6EE7B7" fontSize="9">{(gridExportW / 1000).toFixed(1)}kWh</tspan>
              <tspan dx="5" fill="#FDE68A" fontSize="9">₹{Math.round(gridExportW / 1000 * 6.5)}/hr</tspan>
            </text>
          </g>
        )}

        {/* Battery Charge label — GATE-1: the inverter↔battery gap is only
            90px (x:505→595), but this label reused the same 120px-wide rect
            as the long diagonal flows, so it always overlapped both node
            rects. Shrunk to 80px (x:510→590, 5px clearance each side) and
            dropped the ₹/hr tspan (redundant — same total cost is already on
            the Load label) so the remaining two tspans still fit comfortably. */}
        {showBattery && batteryChargeW > 0 && batteryOn && (
          <g className="pointer-events-none" data-flow-label="true" data-flow-type="battery-charge">
            <rect x={510} y={127} width={80} height={16} rx={8} fill="rgba(0,0,0,0.55)" stroke="#22C55E" strokeWidth={0.5} />
            <text x={550} y={135} textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, sans-serif">
              <tspan fill="#34D399" fontSize="9" fontWeight="600">{Math.round(batteryChargeW)}W</tspan>
              <tspan dx="4" fill="#6EE7B7" fontSize="8">{(batteryChargeW / 1000).toFixed(1)}kWh</tspan>
            </text>
          </g>
        )}

        {/* Battery Discharge label — same shrink as Battery Charge above. */}
        {showBattery && batteryDischargeW > 0 && batteryOn && (
          <g className="pointer-events-none" data-flow-label="true" data-flow-type="battery-discharge">
            <rect x={510} y={127} width={80} height={16} rx={8} fill="rgba(0,0,0,0.55)" stroke="#F97316" strokeWidth={0.5} />
            <text x={550} y={135} textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, sans-serif">
              <tspan fill="#FB923C" fontSize="9" fontWeight="600">{Math.round(batteryDischargeW)}W</tspan>
              <tspan dx="4" fill="#6EE7B7" fontSize="8">{(batteryDischargeW / 1000).toFixed(1)}kWh</tspan>
            </text>
          </g>
        )}

        {/* Load (Inverter→Ghar) label */}
        {!systemOffline && loadW > 0 && !isOnGridOffline && (
          <g className="pointer-events-none" data-flow-label="true" data-flow-type="load">
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
          {/* R11 (code review): badge text "×8/4.8kW" overflowed the fixed
              34px badge pill on narrow screens — "8×600W" is shorter and reads
              cleaner without needing to widen the pill itself. */}
          <ComponentNode
            cx={110} cy={85}
            label={L(lang, "solarPanels")}
            subvalue={solarOn ? `${Math.round(effectiveSolarW)} W` : "0 W (OFF)"}
            iconType="sun"
            glowColor={solarOn ? "#F6C90E" : "#475569"}
            isActive={effectiveSolarW > 0 && !isOnGridOffline && solarOn}
            badge={isRealSetup ? `8×600W` : undefined}
            tooltip="Suraj ki roshni → bijli. Jitni dhoop, utni bijli."
            controls={<SolarNodeControls isMobile={isMobile} />}
            controlsHeight={SOLAR_CONTROLS_H}
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
                controlsHeight={GRID_CONTROLS_H}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* COL-2 CENTER: Hybrid Inverter — cx=430, cy=150, controlsHeight=40 */}
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
              stroke={
                isRealSetup
                  ? houseOverloadLevel !== "none" ? "#EF4444" : "#22D3EE"
                  : inverterOverload ? "#EF4444" : mode === "on-grid" ? "#3B82F6" : mode === "off-grid" ? "#22C55E" : "#06B6D4"
              }
              strokeWidth={2}
              initial={{ opacity: 0.9, r: 30 }}
              animate={{ opacity: 0, r: 60 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            {/* GATE-1 (Rajat: "SMART" pill overlapped the border) — the
                `badge` prop is dropped entirely rather than repositioned:
                the label below already reads "UGE5048 — SMART", so the
                corner badge was pure duplication, not new information. */}
            <ComponentNode
              cx={430} cy={150}
              label={
                isRealSetup
                  ? `UGE5048 — ${PCU_MODE_BADGE[pcuMode]}`
                  : mode === "on-grid"
                  ? L(lang, "onGrid") + (lang === "en" ? " Inverter" : " इन्वर्टर")
                  : mode === "off-grid"
                  ? L(lang, "offGrid") + (lang === "en" ? " Inverter" : " इन्वर्टर")
                  : L(lang, "inverter")
              }
              subvalue={
                isRealSetup
                  ? pcuTripped ? L(lang, "trippedBadge") : `${(PCU_CAP_W / 1000).toFixed(1)} kW`
                  : inverterOverload ? "OVERLOAD!" : `${(useSimStore.getState().inverterWatts / 1000).toFixed(1)} kW`
              }
              iconType="zap"
              glowColor={
                isRealSetup
                  ? houseOverloadLevel !== "none" ? "#EF4444" : "#22D3EE"
                  : inverterOverload ? "#EF4444" : mode === "on-grid" ? "#60A5FA" : mode === "off-grid" ? "#34D399" : "#22D3EE"
              }
              isActive={!systemOffline}
              danger={isRealSetup ? pcuTripped : inverterOverload}
              tooltip="DC→AC conversion. Handles all loads in your home."
              controls={<InverterNodeControls isMobile={isMobile} />}
              controlsHeight={INVERTER_CONTROLS_H}
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
                subvalue={batteryOn && batteryKwh > 0
                  ? `${Math.round(batterySoc * 100)}%`
                  : batteryOn ? "No Battery" : "Disabled"}
                iconType="battery"
                glowColor={batteryOn ? socColor : "#475569"}
                isActive={batteryActive}
                socPercent={batteryOn && batteryKwh > 0 ? batterySoc : 0}
                isCharging={batteryChargeW > 0 && batteryOn}
                tooltip="Charges in the day, powers your home at night or during cuts."
                controls={<BatteryNodeControls isMobile={isMobile} />}
                controlsHeight={BATTERY_CONTROLS_H}
                // GATE-2 round-3 (Rajat: "one bar, not two") — this IS the
                // interactive slider now; BatteryNodeControls no longer
                // renders a second track underneath it.
                socEditable
                onSocChange={(v) => {
                  setBatterySoc(v);
                  setSocLocked(true);
                }}
                socDisabled={!batteryOn || batteryKwh <= 0}
                socThumbColor={socColor}
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
            overloadLevel={houseOverloadLevel}
            tooltip="Tap to manage appliances"
            controls={<GharNodeControls />}
            controlsHeight={GHAR_CONTROLS_H}
          />
          {/* Per-hour kWh and cost line — below watt value, inside the card's
              base zone (Real Setup amber/red/tripped: overload status +
              countdown instead). GATE-2 round-3: kept inside cy±(NODE_H_BASE/2)
              — the base zone stays fixed at 70px regardless of controlsHeight,
              so this offset from cy is always safe, clear of the "☰ Appliances"
              controls row now embedded lower in the (taller) card. */}
          <text
            x={890} y={168}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={isRealSetup && houseOverloadLevel !== "none" ? (houseOverloadLevel === "amber" ? "#FB923C" : "#EF4444") : "#64748B"}
            fontSize="9"
            fontFamily="Inter, sans-serif"
            fontWeight={isRealSetup && houseOverloadLevel !== "none" ? "700" : "400"}
            className="pointer-events-none select-none"
          >
            {/* R11 (code review): on mobile the node is too narrow for the full
                sentence — shorten to an "⚠ 57s"-style badge and rely on the
                RealSetupToast (mobile fallback slot, fires on the same
                band/trip transition) to carry the full copy. Colour is never
                the only channel either way — the text itself still changes. */}
            {isRealSetup && pcuTripped
              ? (isMobile ? `⚠ ${L(lang, "trippedBadge")}` : L(lang, "overloadTripped"))
              : isRealSetup && houseOverloadLevel === "amber"
                ? (isMobile
                    ? `⚠${overloadRemainingSec !== null ? ` ${overloadRemainingSec}s` : ""}`
                    : `${L(lang, "overloadAmber")}${overloadRemainingSec !== null ? ` (${overloadRemainingSec}s)` : ""}`)
                : isRealSetup && houseOverloadLevel === "red"
                  ? (isMobile
                      ? `⚠${overloadRemainingSec !== null ? ` ${overloadRemainingSec}s` : ""}`
                      : `${L(lang, "overloadRed")}${overloadRemainingSec !== null ? ` (${overloadRemainingSec}s)` : ""}`)
                  : `~${(loadW / 1000).toFixed(2)}kWh | ${fmtRs((loadW / 1000) * 6.50)}${L(lang, "perHour")}`}
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
  );

  // ── Mobile: horizontally-scrollable, aspect-locked canvas (no vertical
  //    dead space — height is always exactly width × 370/1000, never a
  //    fixed/guessed value) — vs Desktop: fills its parent box, SVG's own
  //    preserveAspectRatio="meet" handles any letterboxing. ──────────────
  const diagramBox = isMobile ? (
    // GATE-2 round-3 fix: the swipe hint must NOT be a descendant of the
    // scrolling element — an absolutely-positioned child of an
    // `overflow-x-auto` container scrolls WITH the content (its containing
    // block is the scrolled padding box), so "centered" drifted off-screen
    // the moment the container scrolled. This outer `relative` wrapper is a
    // separate, non-scrolling positioning context the hint anchors to
    // instead, so it always stays centered over the visible viewport.
    <div className="relative w-full">
      <div
        ref={scrollRef}
        onScroll={handleMobileScroll}
        className="w-full overflow-x-auto overflow-y-hidden schematic-mobile-scroll"
      >
        <div style={{ width: MOBILE_SCHEMATIC_MIN_W, aspectRatio: "1000 / 370", position: "relative" }}>
          {schematicSvg}
          {isRealSetup && <OverloadWatcher />}
        </div>
      </div>
      {/* Swipe hint — fades away after the first user-initiated scroll */}
      <div
        className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] text-text-secondary select-none"
        style={{
          background: "rgba(15,23,42,0.85)",
          border: "1px solid rgba(255,255,255,0.08)",
          opacity: showSwipeHint ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
        aria-hidden="true"
      >
        {L(lang, "swipeHint")}
      </div>
    </div>
  ) : (
    <div className="flex-1 min-h-0 relative">
      {schematicSvg}
      {isRealSetup && <OverloadWatcher />}
      {/* Ghar Appliance Drawer — float mode only (pinned mode renders in
          DiagramLayout as docked aside). Desktop only — appliances are
          always visible below the diagram on mobile. */}
      <GharDrawer
        open={gharDrawerOpen}
        onClose={closeGharDrawer}
        isPinned={gharDrawerPinned}
        onPinToggle={togglePin}
      />
    </div>
  );

  return (
    <div className={isMobile ? "w-full flex flex-col" : "w-full h-full flex flex-col"} style={{ position: "relative" }}>
      {modeBadge}
      {diagramBox}
    </div>
  );
}
