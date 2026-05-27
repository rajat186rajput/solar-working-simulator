"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSimStore } from "@/store/simulation-store";
import { PowerFlowLine } from "./PowerFlowLine";
import { ParticleStream } from "./ParticleStream";
import { ComponentNode } from "./ComponentNode";

// ─── Layout (viewBox 0 0 900 320) ─────────────────────────────────────────────
//
// Matches Rajat's hand-drawn sketch (horizontal flow):
//
//            [UPPCL Grid]           cx=450, cy=75  (top center)
//                  |
//                  ↓
// [Solar Panels] → [Hybrid Inverter] → [Battery]
//  cx=130, cy=190   cx=450, cy=200     cx=775, cy=170
//                  |
//                  ↓
//            [Ghar (Load)]          cx=450, cy=285 (bottom center)
//
// Node geometry (NODE_W=150, NODE_H_BASE=70):
//   Grid:    total_h=142 (70+72)  → y: 75-71=4   to 75+71=146
//   Inverter:total_h=70            → y: 200-35=165 to 200+35=235
//   Solar:   total_h=175 (70+105) → y: 190-87=103 to 190+88=278 | x: 130-75=55 to 130+75=205
//   Battery: total_h=215 (70+145) → y: 170-107=63 to 170+108=278 | x: 775-75=700 to 775+75=850
//   Ghar:    total_h=70            → y: 285-35=250 to 285+35=320
//
// Flow paths (node-edge to node-edge):
//   Solar  → Inverter : right edge of Solar (205,190) → left edge Inverter (375,200)
//   Grid   → Inverter : bottom of Grid (450,146)      → top of Inverter (450,165)
//   Inverter→ Battery : right of Inverter (525,200)   → left of Battery (700,170)
//   Battery→ Inverter : left of Battery (700,180)     → right of Inverter (525,210)  [bidirectional]
//   Inverter→ Ghar    : bottom of Inverter (450,235)  → top of Ghar (450,250)

const PATHS = {
  solar:         "M 207 190  L 373 200",
  gridImport:    "M 450 148  L 450 163",
  gridExport:    "M 450 156  L 450 141",
  batteryCharge: "M 527 198  L 698 170",
  batteryDisch:  "M 698 180  L 527 208",
  load:          "M 450 237  L 450 248",
};

// ─── Solar capacity presets ────────────────────────────────────────────────
const SOLAR_PRESETS = [
  { label: "2",   kwp: 2   },
  { label: "4.4", kwp: 4.4 },
  { label: "5",   kwp: 5   },
  { label: "7",   kwp: 7   },
  { label: "10",  kwp: 10  },
];

function pillStyle(active: boolean, activeColor: string, disabled = false) {
  return {
    padding: "1px 5px",
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 600 as const,
    border: `1px solid ${active ? activeColor : "#334155"}`,
    background: active ? `${activeColor}22` : "transparent",
    color: active ? activeColor : "#64748B",
    cursor: disabled ? "not-allowed" as const : "pointer" as const,
    opacity: disabled ? 0.4 : 1,
    lineHeight: "1.4",
  };
}

// ─── ON/OFF 2-pill toggle ──────────────────────────────────────────────────
function OnOffToggle({
  isOn,
  onToggle,
  onColor,
  onLabel = "ON",
  offLabel = "OFF",
  offColor = "#64748B",
  offActiveColor,
}: {
  isOn: boolean;
  onToggle: () => void;
  onColor: string;
  onLabel?: string;
  offLabel?: string;
  offColor?: string;
  offActiveColor?: string;
}) {
  const resolvedOffColor = offActiveColor ?? offColor;
  return (
    <div style={{ display: "flex", gap: 4, width: "100%" }}>
      <button
        onClick={() => !isOn && onToggle()}
        style={{
          flex: 1,
          padding: "5px 0",
          borderRadius: 5,
          fontSize: 11,
          fontWeight: 700,
          border: `1.5px solid ${isOn ? onColor : "#334155"}`,
          background: isOn ? `${onColor}28` : "transparent",
          color: isOn ? onColor : "#475569",
          cursor: isOn ? "default" : "pointer",
          letterSpacing: "0.04em",
          transition: "all 0.15s ease",
        }}
        aria-pressed={isOn}
      >
        {onLabel}
      </button>
      <button
        onClick={() => isOn && onToggle()}
        style={{
          flex: 1,
          padding: "5px 0",
          borderRadius: 5,
          fontSize: 11,
          fontWeight: 700,
          border: `1.5px solid ${!isOn ? resolvedOffColor : "#334155"}`,
          background: !isOn ? `${resolvedOffColor}28` : "transparent",
          color: !isOn ? resolvedOffColor : "#475569",
          cursor: !isOn ? "default" : "pointer",
          letterSpacing: "0.04em",
          transition: "all 0.15s ease",
        }}
        aria-pressed={!isOn}
      >
        {offLabel}
      </button>
    </div>
  );
}

// ─── Solar node controls ───────────────────────────────────────────────────
function SolarNodeControls() {
  const { solarOn, toggleSolar, panelKwp, setPanelKwp } = useSimStore();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "2px 2px 0",
        height: "100%",
      }}
    >
      <OnOffToggle
        isOn={solarOn}
        onToggle={toggleSolar}
        onColor="#F6C90E"
        onLabel="ON"
        offLabel="OFF"
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {SOLAR_PRESETS.map((p) => (
          <button
            key={p.kwp}
            onClick={() => setPanelKwp(p.kwp)}
            disabled={!solarOn}
            style={pillStyle(panelKwp === p.kwp && solarOn, "#F6C90E", !solarOn)}
          >
            {p.label} kWp
          </button>
        ))}
      </div>
      <div style={{ fontSize: 9, color: solarOn ? "#F6C90E88" : "#47556977", lineHeight: 1 }}>
        {solarOn ? `${panelKwp} kWp · ~${(panelKwp * 4.5).toFixed(0)} kWh/day` : "Disconnected"}
      </div>
    </div>
  );
}

// ─── Battery capacity presets ──────────────────────────────────────────────
interface BatteryPreset {
  label: string;
  kwh: number;
  chemistry: "lifepo4" | "lead-acid";
  isNone?: boolean;
}

const BATTERY_PRESETS: BatteryPreset[] = [
  { label: "None",    kwh: 0,   chemistry: "lifepo4",   isNone: true },
  { label: "5",       kwh: 5,   chemistry: "lifepo4"   },
  { label: "10",      kwh: 10,  chemistry: "lifepo4"   },
  { label: "15",      kwh: 15,  chemistry: "lifepo4"   },
  { label: "20",      kwh: 20,  chemistry: "lifepo4"   },
  { label: "7.2 PbA", kwh: 7.2, chemistry: "lead-acid" },
];

// ─── Battery node controls ─────────────────────────────────────────────────
function BatteryNodeControls() {
  const {
    batteryKwh, setBatteryKwh,
    batteryType, setBatteryType,
    batteryOn, toggleBattery,
    batterySoc, setBatterySoc,
  } = useSimStore();

  const isNoneActive = batteryKwh <= 0 || !batteryOn;

  const handlePreset = (p: BatteryPreset) => {
    setBatteryKwh(p.kwh);
    setBatteryType(p.chemistry);
    if (p.isNone && batteryOn) toggleBattery();
    if (!p.isNone && !batteryOn) toggleBattery();
  };

  const activePreset = isNoneActive
    ? BATTERY_PRESETS.find((p) => p.isNone)
    : BATTERY_PRESETS.find((p) => !p.isNone && p.kwh === batteryKwh && p.chemistry === batteryType);

  const socColor = batterySoc >= 0.8 ? "#22C55E"
    : batterySoc >= 0.4 ? "#EAB308"
    : batterySoc >= 0.2 ? "#F97316"
    : "#EF4444";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "2px 2px 0", height: "100%" }}>
      <OnOffToggle
        isOn={batteryOn}
        onToggle={toggleBattery}
        onColor="#10B981"
        onLabel="ON"
        offLabel="OFF"
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {BATTERY_PRESETS.map((p) => {
          const isActive = p.isNone
            ? isNoneActive
            : (!isNoneActive && activePreset?.kwh === p.kwh && activePreset?.chemistry === p.chemistry);
          return (
            <button
              key={`${p.kwh}-${p.chemistry}`}
              onClick={() => handlePreset(p)}
              style={pillStyle(isActive, p.isNone ? "#64748B" : "#10B981")}
            >
              {p.label}{!p.isNone && p.chemistry === "lifepo4" ? " kWh" : ""}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        {(["lifepo4", "lead-acid"] as const).map((chem) => (
          <button
            key={chem}
            onClick={() => !isNoneActive && setBatteryType(chem)}
            disabled={isNoneActive}
            style={{
              ...pillStyle(batteryType === chem && !isNoneActive, "#10B981", isNoneActive),
              flex: 1,
              textAlign: "center" as const,
            }}
          >
            {chem === "lifepo4" ? "LFP" : "PbA"}
          </button>
        ))}
      </div>
      {!isNoneActive && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 9, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              SoC Override
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: socColor, fontVariantNumeric: "tabular-nums" }}>
              {Math.round(batterySoc * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(batterySoc * 100)}
            onChange={(e) => setBatterySoc(parseInt(e.target.value) / 100)}
            style={{
              width: "100%",
              height: 6,
              accentColor: socColor,
              cursor: "pointer",
              margin: 0,
            }}
            aria-label="Battery state of charge override"
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#475569" }}>
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Grid node controls ────────────────────────────────────────────────────
function GridNodeControls() {
  const { gridAvailable, setGridAvailable, mode } = useSimStore();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "2px 2px 0" }}>
      <OnOffToggle
        isOn={gridAvailable}
        onToggle={() => setGridAvailable(!gridAvailable)}
        onColor="#3B82F6"
        onLabel="Bijli ON"
        offLabel="Bijli OFF"
        offActiveColor="#EF4444"
      />
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
    // 30vh container — full width, short height
    <div className="w-full h-full" style={{ position: "relative" }}>
      <svg
        viewBox="0 0 900 320"
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
        <rect width="900" height="320" fill="url(#grid-bg)" opacity="0.5" />

        {/* ── FLOW LINES ── */}

        {/* Solar → Inverter (horizontal, left to right) */}
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

        {/* Grid Import: Grid → Inverter (vertical, top to bottom) */}
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

        {/* Grid Export: Inverter → Grid (vertical, bottom to top) */}
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

        {/* Battery Charge: Inverter → Battery (horizontal, right) */}
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

        {/* Battery Discharge: Battery → Inverter (horizontal, left, dashed/reverse) */}
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

        {/* Inverter → Ghar/Load (vertical, bottom) */}
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

        {/* ── COMPONENT NODES ── */}

        {/* LEFT: Solar Panels — cx=130, cy=190, controlsHeight=105 */}
        <motion.g
          initial={{ opacity: 0, scale: 0.7, x: -20 }}
          animate={{ opacity: solarOn ? 1 : 0.45, scale: 1, x: 0 }}
          transition={{ delay: 0, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <ComponentNode
            cx={130} cy={190}
            label="Solar Panels"
            subvalue={solarOn ? `${Math.round(effectiveSolarW)} W` : "0 W (OFF)"}
            iconType="sun"
            glowColor={solarOn ? "#F6C90E" : "#475569"}
            isActive={effectiveSolarW > 0 && !isOnGridOffline && solarOn}
            tooltip="Ye panels suraj ki roshni ko bijli mein badal dete hain. Jitni dhoop, utni bijli — cloudy din mein 40% kam banta hai."
            controls={<SolarNodeControls />}
            controlsHeight={105}
          />
        </motion.g>

        {/* TOP-CENTER: UPPCL Grid — cx=450, cy=75, controlsHeight=72 */}
        <AnimatePresence mode="wait">
          {showGrid && (
            <motion.g
              key={`grid-${mode}`}
              initial={{ opacity: 0, scale: 0.6, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ delay: 0.1, duration: 0.3, ease: "easeInOut" }}
            >
              <ComponentNode
                cx={450} cy={75}
                label="UPPCL Grid"
                subvalue={gridAvailable ? "Available" : "Disconnected"}
                iconType="plug"
                glowColor={gridAvailable ? "#3B82F6" : "#EF4444"}
                isActive={gridAvailable}
                danger={!gridAvailable}
                tooltip="UPPCL ki line. On-Grid mein bijli kate toh solar bhi band ho jata hai — safety ke liye. Hybrid mein battery use hoti hai."
                controls={<GridNodeControls />}
                controlsHeight={72}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* CENTER: Hybrid Inverter — cx=450, cy=200, no controls */}
        <motion.g
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <ComponentNode
            cx={450} cy={200}
            label={mode === "on-grid" ? "On-Grid Inverter" : mode === "off-grid" ? "Off-Grid Inverter" : "Hybrid Inverter"}
            subvalue={inverterOverload ? "OVERLOAD!" : `${(useSimStore.getState().inverterWatts / 1000).toFixed(1)} kW`}
            iconType="zap"
            glowColor={inverterOverload ? "#EF4444" : "#F1F5F9"}
            isActive={!systemOffline}
            danger={inverterOverload}
            tooltip="Inverter DC bijli ko AC mein badalta hai. Ghar mein saari bijli AC hoti hai. Iska size decide karta hai ek waqt mein kitna load chal sakta hai."
          />
        </motion.g>

        {/* RIGHT: Battery — cx=775, cy=170, controlsHeight=145 */}
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
                cx={775} cy={170}
                label="Battery"
                subvalue={batteryOn && useSimStore.getState().batteryKwh > 0
                  ? `${Math.round(batterySoc * 100)}%`
                  : batteryOn ? "No Battery" : "Disabled"}
                iconType="battery"
                glowColor={batteryOn ? socColor : "#475569"}
                isActive={batteryActive}
                socPercent={batteryOn && useSimStore.getState().batteryKwh > 0 ? batterySoc : 0}
                tooltip="Battery din mein charge hoti hai aur raat mein ya bijli kate tab use hoti hai. LiFePO4 battery 90% tak use ho sakti hai — lead-acid sirf 50%."
                controls={<BatteryNodeControls />}
                controlsHeight={145}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* BOTTOM-CENTER: Ghar (Load) — cx=450, cy=285, no controls */}
        <motion.g
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <ComponentNode
            cx={450} cy={285}
            label="Ghar (Load)"
            subvalue={`${Math.round(loadW)} W`}
            iconType="house"
            glowColor="#F1F5F9"
            isActive={!systemOffline}
            tooltip="Ghar ka total consumption. AC, fan, fridge, TV sab milake. Jitna kam load, utna zyada backup time."
          />
        </motion.g>

        {/* On-Grid grid-fail blackout overlay */}
        {isOnGridOffline && (
          <motion.rect
            x={0} y={0} width={900} height={320}
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
