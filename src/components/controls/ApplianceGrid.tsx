"use client";

import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { APPLIANCES, CATEGORY_COLORS } from "@/lib/appliances";
import { useSimStore } from "@/store/simulation-store";
import {
  Wind, Lightbulb, Refrigerator, Tv, Droplets,
  Flame, WashingMachine, Microwave, Shirt, Blender, Car, Zap,
} from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  ac:        <Wind size={14} />,
  fan:       <Wind size={14} />,
  light:     <Lightbulb size={14} />,
  fridge:    <Refrigerator size={14} />,
  tv:        <Tv size={14} />,
  pump:      <Droplets size={14} />,
  geyser:    <Flame size={14} />,
  washing:   <WashingMachine size={14} />,
  microwave: <Microwave size={14} />,
  iron:      <Shirt size={14} />,
  mixer:     <Blender size={14} />,
  ev:        <Car size={14} />,
};

// Appliances that should have the "Grid Only" toggle (watts >= 800W)
const HEAVY_APPLIANCE_IDS = new Set(
  APPLIANCES.filter((a) => a.watts >= 800).map((a) => a.id)
);

export function ApplianceGrid() {
  const { applianceQtys, gridOnlyAppliances, toggleAppliance, setApplianceQty, toggleGridOnly, solarW } = useSimStore();

  // Compute per-appliance solar coverage: cumulative watts in APPLIANCES order
  // Appliances covered within solarW budget get ☀️ Solar badge, rest get ⚡ Grid
  let cumulativeW = 0;
  const solarCoveredIds = new Set<string>();
  for (const appliance of APPLIANCES) {
    const entry = applianceQtys.find((e) => e.id === appliance.id);
    const isOn = entry?.isOn ?? false;
    const qty = entry?.qty ?? 1;
    if (!isOn) continue;
    const appW = qty * appliance.watts;
    if (cumulativeW + appW <= solarW) {
      solarCoveredIds.add(appliance.id);
    }
    cumulativeW += appW;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
        Appliances
      </div>
      {/* 3-column grid, all 12 appliances */}
      <div className="grid grid-cols-3 gap-1 flex-1 content-start">
        {APPLIANCES.map((appliance) => {
          const entry = applianceQtys.find((e) => e.id === appliance.id);
          const isOn = entry?.isOn ?? false;
          const qty = entry?.qty ?? 1;
          const catColor = CATEGORY_COLORS[appliance.category] || "#94A3B8";
          const effectiveW = isOn ? qty * appliance.watts : 0;
          const isHeavy = HEAVY_APPLIANCE_IDS.has(appliance.id);
          const isGridOnly = gridOnlyAppliances.has(appliance.id);
          const isSolarPowered = isOn && solarCoveredIds.has(appliance.id);

          return (
            <motion.div
              key={appliance.id}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              animate={{
                backgroundColor: isOn ? "rgba(30,41,59,1)" : "rgba(15,23,42,0.5)",
                borderColor: isOn ? catColor : "#334155",
              }}
              transition={{ duration: 0.2 }}
              className="rounded-lg border p-1.5 select-none flex flex-col gap-0.5"
              role="checkbox"
              aria-checked={isOn}
              aria-label={`Toggle ${appliance.name} (${appliance.watts}W × ${qty})`}
            >
              {/* Icon + switch row */}
              <div className="flex items-center justify-between">
                <div
                  className="p-1 rounded cursor-pointer"
                  style={{
                    backgroundColor: isOn ? `${catColor}20` : "rgba(51,65,85,0.4)",
                    color: isOn ? catColor : "#475569",
                  }}
                  onClick={() => toggleAppliance(appliance.id)}
                >
                  {ICON_MAP[appliance.id] ?? <Zap size={14} />}
                </div>
                <span className="inline-flex items-center justify-center p-2 -m-2 min-h-[44px]">
                  <Switch
                    checked={isOn}
                    onCheckedChange={() => toggleAppliance(appliance.id)}
                    aria-label={`Toggle ${appliance.name}`}
                    className="scale-75 origin-right"
                  />
                </span>
              </div>

              {/* Name */}
              <div
                className="text-[10px] font-medium leading-tight truncate cursor-pointer"
                style={{ color: isOn ? "#F1F5F9" : "#64748B" }}
                onClick={() => toggleAppliance(appliance.id)}
              >
                {appliance.hinglishLabel}
              </div>

              {/* Per-item wattage */}
              <div className="text-[10px] leading-none" style={{ color: "#475569" }}>
                {appliance.watts}W each
              </div>

              {/* Watts display */}
              <div
                className="text-[10px] font-bold tabular-nums leading-none"
                style={{ color: isOn ? catColor : "#334155" }}
              >
                {isOn ? `${effectiveW}W` : "—"}
              </div>

              {/* Source badge — solar or grid */}
              {isOn && (
                <div
                  className="text-[9px] font-semibold leading-none"
                  style={{ color: isSolarPowered ? "#84CC16" : "#60A5FA" }}
                >
                  {isSolarPowered ? "☀️ Solar" : "⚡ Grid"}
                </div>
              )}

              {/* Quantity stepper */}
              <div className="flex items-center gap-0.5 mt-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setApplianceQty(appliance.id, qty - 1);
                  }}
                  disabled={qty <= 0}
                  className="w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold leading-none transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: isOn ? `${catColor}20` : "rgba(51,65,85,0.4)",
                    color: isOn ? catColor : "#475569",
                  }}
                  aria-label={`Decrease ${appliance.name} quantity`}
                >
                  −
                </button>
                <span
                  className="text-[10px] font-bold tabular-nums w-4 text-center"
                  style={{ color: isOn ? "#F1F5F9" : "#475569" }}
                >
                  {qty}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setApplianceQty(appliance.id, qty + 1);
                  }}
                  disabled={qty >= 10}
                  className="w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold leading-none transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: isOn ? `${catColor}20` : "rgba(51,65,85,0.4)",
                    color: isOn ? catColor : "#475569",
                  }}
                  aria-label={`Increase ${appliance.name} quantity`}
                >
                  +
                </button>
              </div>

              {/* Grid Only toggle — heavy appliances only (watts >= 800W) */}
              {isHeavy && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGridOnly(appliance.id);
                  }}
                  className="mt-0.5 rounded text-[9px] font-semibold leading-none px-1 py-0.5 transition-colors"
                  style={{
                    backgroundColor: isGridOnly ? "rgba(234,179,8,0.15)" : "rgba(51,65,85,0.4)",
                    color: isGridOnly ? "#EAB308" : "#475569",
                    border: isGridOnly ? "1px solid rgba(234,179,8,0.4)" : "1px solid transparent",
                  }}
                  aria-label={`${isGridOnly ? "Disable" : "Enable"} Grid Only mode for ${appliance.name}`}
                  title="Grid Only: this appliance is excluded from solar/battery load"
                >
                  {isGridOnly ? "⚡ Grid Only" : "⚡ Grid"}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
