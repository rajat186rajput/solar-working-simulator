"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSimStore } from "@/store/simulation-store";
import { calcBackupHours } from "@/lib/simulation";
import { PowerFlowLine } from "./PowerFlowLine";
import { ParticleStream } from "./ParticleStream";
import { ComponentNode } from "./ComponentNode";

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
  const { solarOn, toggleSolar, panelKwp, setPanelKwp } = useSimStore();

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
          {solarOn ? "ON" : "OFF"}
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
      <div style={{ fontSize: 9, color: solarOn ? "#F6C90E88" : "#47556977", lineHeight: 1 }}>
        {solarOn ? `~${(panelKwp * 4.5).toFixed(0)} kWh/day` : "Disconnected"}
      </div>
    </div>
  );
}

// ─── Battery DOD factors (mirrors simulation.ts constants) ───────────────
const DOD_FACTOR: Record<"lifepo4" | "lead-acid", number> = {
  lifepo4: 0.90,
  "lead-acid": 0.50,
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
    batteryChargeW, batteryDischargeW,
    loadW,
    socLocked, setSocLocked,
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

  // Time estimates
  const usableKwh = batteryKwh * DOD_FACTOR[batteryType] * INVERTER_EFF;
  const usableWh = usableKwh * 1000;
  let timeEstimate: string;
  if (batteryChargeW > 0) {
    const hoursToFull = ((1 - batterySoc) * usableWh) / batteryChargeW;
    timeEstimate = `⚡ Full in ${fmtHours(hoursToFull)}`;
  } else if (batteryDischargeW > 0) {
    const hoursToEmpty = (batterySoc * usableWh) / batteryDischargeW;
    timeEstimate = `🔋 Empty in ${fmtHours(hoursToEmpty)}`;
  } else {
    timeEstimate = "~ Idle";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, padding: "4px 2px 0", height: "100%" }}>
      {/* Toggle row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <CompactToggle isOn={batteryOn} onToggle={toggleBattery} onColor="#10B981" />
        <span style={{ fontSize: 10, color: batteryOn ? "#10B981" : "#64748B", fontWeight: 600 }}>
          {batteryOn ? "ON" : "OFF"}
        </span>
        {/* Backup time */}
        <span style={{ marginLeft: "auto", fontSize: 9, color: "#64748B", fontVariantNumeric: "tabular-nums" }}>
          Backup: <span style={{ color: socColor, fontWeight: 700 }}>{backupDisplay}</span>
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
          <span style={{ fontSize: 9, color: "#475569", marginLeft: 2 }}>
            {socLocked ? "manual" : "auto"}
          </span>
        </div>
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
  const { gridAvailable, setGridAvailable, mode } = useSimStore();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "4px 2px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <CompactToggle
          isOn={gridAvailable}
          onToggle={() => setGridAvailable(!gridAvailable)}
          onColor="#3B82F6"
        />
        <span style={{ fontSize: 10, color: gridAvailable ? "#3B82F6" : "#EF4444", fontWeight: 600 }}>
          {gridAvailable ? "Bijli ON" : "Bijli OFF"}
        </span>
      </div>
      {!gridAvailable && (
        <div style={{ fontSize: 9, color: "#EF444488", lineHeight: 1.2 }}>
          {mode === "on-grid" ? "Solar bhi band" : "Battery backup"}
        </div>
      )}
    </div>
  );
}

export function SchematicSVG() {
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
  } = useSimStore();

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

        {/* Background grid lines */}
        <defs>
          <pattern id="grid-bg" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" strokeWidth="0.5" />
          </pattern>
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

        {/* ── FLOW WATT LABELS ── */}

        {/* Solar → Inverter label (bezier midpoint ≈ 293,118, offset y-12) */}
        {effectiveSolarW > 0 && !isOnGridOffline && solarOn && (
          <text
            x={293} y={106}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#94A3B8"
            fontSize="10"
            fontFamily="Inter, sans-serif"
            className="pointer-events-none"
          >
            {`${Math.round(effectiveSolarW)} W`}
          </text>
        )}

        {/* Grid Import label (bezier midpoint ≈ 293,208, offset y-12) */}
        {showGrid && gridImportW > 0 && gridAvailable && (
          <text
            x={293} y={196}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#94A3B8"
            fontSize="10"
            fontFamily="Inter, sans-serif"
            className="pointer-events-none"
          >
            {`${Math.round(gridImportW)} W`}
          </text>
        )}

        {/* Grid Export label (bezier midpoint ≈ 293,210, offset y+14) */}
        {showGrid && gridExportW > 0 && gridAvailable && (
          <text
            x={293} y={224}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#94A3B8"
            fontSize="10"
            fontFamily="Inter, sans-serif"
            className="pointer-events-none"
          >
            {`${Math.round(gridExportW)} W`}
          </text>
        )}

        {/* Battery Charge label (horizontal midpoint 550,150, offset y-12) */}
        {showBattery && batteryChargeW > 0 && batteryOn && (
          <text
            x={550} y={138}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#94A3B8"
            fontSize="10"
            fontFamily="Inter, sans-serif"
            className="pointer-events-none"
          >
            {`${Math.round(batteryChargeW)} W`}
          </text>
        )}

        {/* Battery Discharge label (horizontal midpoint 550,154, offset y+14) */}
        {showBattery && batteryDischargeW > 0 && batteryOn && (
          <text
            x={550} y={168}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#94A3B8"
            fontSize="10"
            fontFamily="Inter, sans-serif"
            className="pointer-events-none"
          >
            {`${Math.round(batteryDischargeW)} W`}
          </text>
        )}

        {/* Load (Inverter→Ghar) label (bottom bypass mid 660,350, offset y-12) */}
        {!systemOffline && loadW > 0 && !isOnGridOffline && (
          <text
            x={660} y={338}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#94A3B8"
            fontSize="10"
            fontFamily="Inter, sans-serif"
            className="pointer-events-none"
          >
            {`${Math.round(loadW)} W`}
          </text>
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
            label="Solar Panels"
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
                label="UPPCL Grid"
                subvalue={gridAvailable ? "Available" : "Disconnected"}
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
        <motion.g
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <ComponentNode
            cx={430} cy={150}
            label={mode === "on-grid" ? "On-Grid Inverter" : mode === "off-grid" ? "Off-Grid Inverter" : "Hybrid Inverter"}
            subvalue={inverterOverload ? "OVERLOAD!" : `${(useSimStore.getState().inverterWatts / 1000).toFixed(1)} kW`}
            iconType="zap"
            glowColor={inverterOverload ? "#EF4444" : "#F1F5F9"}
            isActive={!systemOffline}
            danger={inverterOverload}
            tooltip="DC→AC conversion. Handles all loads in your home."
          />
        </motion.g>

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
                label="Battery"
                subvalue={batteryOn && useSimStore.getState().batteryKwh > 0
                  ? `${Math.round(batterySoc * 100)}%`
                  : batteryOn ? "No Battery" : "Disabled"}
                iconType="battery"
                glowColor={batteryOn ? socColor : "#475569"}
                isActive={batteryActive}
                socPercent={batteryOn && useSimStore.getState().batteryKwh > 0 ? batterySoc : 0}
                tooltip="Charges in the day, powers your home at night or during cuts."
                controls={<BatteryNodeControls />}
                controlsHeight={147}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* COL-4 RIGHT: Ghar (Load) — cx=890, cy=150, no controls */}
        <motion.g
          initial={{ opacity: 0, scale: 0.7, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <ComponentNode
            cx={890} cy={150}
            label="Ghar (Load)"
            subvalue={`${Math.round(loadW)} W`}
            iconType="house"
            glowColor="#F1F5F9"
            isActive={!systemOffline}
            tooltip="Total home consumption across all appliances."
          />
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
    </div>
  );
}
