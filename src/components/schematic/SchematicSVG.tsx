"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSimStore } from "@/store/simulation-store";
import { PowerFlowLine } from "./PowerFlowLine";
import { ParticleStream } from "./ParticleStream";
import { ComponentNode } from "./ComponentNode";

// SVG viewBox: 0 0 1000 600
// Component positions (cx, cy):
// Solar Panels:  120, 120
// Inverter:      490, 300
// Battery:       120, 420
// Grid:          860, 180
// Net Meter:     860, 300
// House:         860, 450

// Path definitions from 02_DESIGN.md
const PATHS = {
  solar:         "M 180 120 C 300 120 380 200 490 270",
  batteryCharge: "M 490 330 C 380 380 250 400 180 420",
  batteryDisch:  "M 180 430 C 250 410 380 390 490 340",
  gridImport:    "M 800 180 C 720 180 620 240 540 280",
  gridExport:    "M 540 270 C 620 230 720 170 800 170",
  load:          "M 540 310 C 660 310 760 390 800 440",
  netMeter:      "M 540 300 C 680 300 760 300 800 300",
  mpptPath:      "M 150 140 C 200 160 260 170 290 200",
};

const staggerDelay = (index: number) => index * 0.08;

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
  } = useSimStore();

  const showBattery = mode === "off-grid" || mode === "hybrid";
  const showGrid = mode === "on-grid" || mode === "hybrid";
  const showMPPT = mode === "off-grid";

  const isGridFail = !gridAvailable;
  const isOnGridOffline = mode === "on-grid" && isGridFail;

  const batteryActive = showBattery && batterySoc > 0;

  // Battery SoC color
  const socColor = batterySoc >= 0.8 ? "#22C55E"
    : batterySoc >= 0.4 ? "#EAB308"
    : batterySoc >= 0.2 ? "#F97316"
    : "#EF4444";

  return (
    <div className="w-full relative">
      <svg
        viewBox="0 0 1000 600"
        className="w-full h-auto"
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
        </defs>
        <rect width="1000" height="600" fill="url(#grid-bg)" opacity="0.5" />

        {/* ---- FLOW LINES ---- */}
        {/* Solar → Inverter */}
        <PowerFlowLine
          pathD={PATHS.solar}
          powerW={isOnGridOffline ? 0 : solarW}
          flowType="solar"
          isActive={solarW > 0 && !isOnGridOffline}
        />
        <ParticleStream
          pathD={PATHS.solar}
          powerW={isOnGridOffline ? 0 : solarW}
          flowType="solar"
          isActive={solarW > 0 && !isOnGridOffline}
        />

        {/* Battery Charge: Inverter → Battery */}
        {showBattery && (
          <>
            <PowerFlowLine
              pathD={PATHS.batteryCharge}
              powerW={batteryChargeW}
              flowType="battery-charge"
              isActive={batteryChargeW > 0}
            />
            <ParticleStream
              pathD={PATHS.batteryCharge}
              powerW={batteryChargeW}
              flowType="battery-charge"
              isActive={batteryChargeW > 0}
            />
          </>
        )}

        {/* Battery Discharge: Battery → Inverter */}
        {showBattery && (
          <>
            <PowerFlowLine
              pathD={PATHS.batteryDisch}
              powerW={batteryDischargeW}
              flowType="battery-discharge"
              isActive={batteryDischargeW > 0}
            />
            <ParticleStream
              pathD={PATHS.batteryDisch}
              powerW={batteryDischargeW}
              flowType="battery-discharge"
              isActive={batteryDischargeW > 0}
            />
          </>
        )}

        {/* Grid Import */}
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

        {/* Grid Export */}
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

        {/* Load: Inverter → House */}
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

        {/* ---- COMPONENT NODES ---- */}

        {/* Solar Panels — cx=120, cy=120 */}
        <motion.g
          initial={{ opacity: 0, scale: 0.7, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <ComponentNode
            cx={120} cy={120}
            label="Solar Panels"
            subvalue={`${Math.round(solarW)} W`}
            iconType="sun"
            glowColor="#F6C90E"
            isActive={solarW > 0 && !isOnGridOffline}
            tooltip="Ye panels suraj ki roshni ko bijli mein badal dete hain. Jitni dhoop, utni bijli — cloudy din mein 40% kam banta hai."
          />
        </motion.g>

        {/* MPPT (Off-Grid only) — 305, 200 */}
        <AnimatePresence>
          {showMPPT && (
            <motion.g
              key="mppt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <rect x={265} y={175} width={80} height={30} rx={8}
                fill="#1E293B" stroke="#334155" strokeWidth={1} />
              <text x={305} y={195} textAnchor="middle" fill="#94A3B8"
                fontSize="10" fontFamily="Inter, sans-serif">MPPT</text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Inverter — cx=490, cy=300 */}
        <motion.g
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <ComponentNode
            cx={490} cy={300}
            label={mode === "on-grid" ? "On-Grid Inverter" : mode === "off-grid" ? "Off-Grid Inverter" : "Hybrid Inverter"}
            subvalue={inverterOverload ? "OVERLOAD!" : `${(useSimStore.getState().inverterWatts / 1000).toFixed(1)} kW`}
            iconType="zap"
            glowColor={inverterOverload ? "#EF4444" : "#F1F5F9"}
            isActive={!systemOffline}
            danger={inverterOverload}
            tooltip="Inverter DC bijli ko AC mein badalta hai. Ghar mein saari bijli AC hoti hai. Iska size decide karta hai ek waqt mein kitna load chal sakta hai."
          />
        </motion.g>

        {/* Battery — cx=120, cy=420 */}
        <AnimatePresence mode="wait">
          {showBattery && (
            <motion.g
              key={`battery-${mode}`}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ delay: 0.4, duration: 0.3, ease: "easeInOut" }}
            >
              <ComponentNode
                cx={120} cy={420}
                label="Battery"
                subvalue={`${Math.round(batterySoc * 100)}%`}
                iconType="battery"
                glowColor={socColor}
                isActive={batteryActive}
                socPercent={batterySoc}
                tooltip="Battery din mein charge hoti hai aur raat mein ya bijli kate tab use hoti hai. LiFePO4 battery 90% tak use ho sakti hai — lead-acid sirf 50%."
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Grid connection — cx=860, cy=180 */}
        <AnimatePresence mode="wait">
          {showGrid && (
            <motion.g
              key={`grid-${mode}`}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ delay: 0.4, duration: 0.3, ease: "easeInOut" }}
            >
              <ComponentNode
                cx={860} cy={180}
                label="UPPCL Grid"
                subvalue={gridAvailable ? "Available" : "FAILED"}
                iconType="plug"
                glowColor={gridAvailable ? "#3B82F6" : "#EF4444"}
                isActive={gridAvailable}
                danger={!gridAvailable}
                tooltip="UPPCL ki line. On-Grid mein bijli kate toh solar bhi band ho jata hai — safety ke liye. Hybrid mein battery use hoti hai."
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Net Meter — cx=860, cy=300 */}
        <AnimatePresence mode="wait">
          {showGrid && (
            <motion.g
              key={`meter-${mode}`}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ delay: staggerDelay(3), duration: 0.3 }}
            >
              <ComponentNode
                cx={860} cy={300}
                label="Net Meter"
                subvalue={gridAvailable ? "Tracking" : "Offline"}
                iconType="gauge"
                glowColor="#A855F7"
                isActive={gridAvailable}
                tooltip="Bidirectional meter — solar zyada hone par units grid mein jaate hain aur bill mein minus hote hain. Ye ek tarha ka bank account hai."
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* House/Load — cx=860, cy=450 */}
        <motion.g
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <ComponentNode
            cx={860} cy={450}
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
            x={0} y={0} width={1000} height={600}
            fill="#000000"
            pointerEvents="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.7, 0.7, 0.4] }}
            transition={{ duration: 1.2, times: [0, 0.15, 0.6, 1] }}
          />
        )}
      </svg>

      {/* Mode label badge */}
      <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-surface-card/80 border border-surface-stroke text-xs text-text-secondary font-mono">
        {mode.toUpperCase()} MODE
      </div>
    </div>
  );
}
