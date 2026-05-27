"use client";

import { motion } from "framer-motion";
import { BatteryCharging, Power } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useSimStore } from "@/store/simulation-store";

interface BatteryPreset {
  label: string;
  kwh: number;
  chemistry: "lifepo4" | "lead-acid";
  isNone?: boolean;
}

const BATTERY_PRESETS: BatteryPreset[] = [
  { label: "None",          kwh: 0,    chemistry: "lifepo4",   isNone: true },
  { label: "5 kWh LFP",    kwh: 5,    chemistry: "lifepo4"   },
  { label: "10 kWh LFP",   kwh: 10,   chemistry: "lifepo4"   },
  { label: "15 kWh LFP",   kwh: 15,   chemistry: "lifepo4"   },
  { label: "20 kWh LFP",   kwh: 20,   chemistry: "lifepo4"   },
  { label: "7.2 kWh PbA",  kwh: 7.2,  chemistry: "lead-acid" },
];

export function BatterySetupCard() {
  const {
    batteryKwh, setBatteryKwh,
    batteryType, setBatteryType,
    batteryOn, toggleBattery,
    batterySoc, setBatterySoc,
    mode,
  } = useSimStore();

  const showBattery = mode === "off-grid" || mode === "hybrid";
  if (!showBattery) return null;

  const socColor =
    batterySoc >= 0.8 ? "#22C55E"
    : batterySoc >= 0.4 ? "#EAB308"
    : batterySoc >= 0.2 ? "#F97316"
    : "#EF4444";

  const handlePreset = (p: BatteryPreset) => {
    setBatteryKwh(p.kwh);
    setBatteryType(p.chemistry);
    // "None" preset disables battery; any real capacity re-enables it
    if (p.isNone && batteryOn) toggleBattery();
    if (!p.isNone && !batteryOn) toggleBattery();
  };

  const isNoneActive = batteryKwh === 0 || !batteryOn;
  const activePreset = isNoneActive
    ? BATTERY_PRESETS.find((p) => p.isNone)
    : BATTERY_PRESETS.find(
        (p) => !p.isNone && p.kwh === batteryKwh && p.chemistry === batteryType
      );

  return (
    <div
      className={`rounded-xl border p-2 flex-shrink-0 transition-all ${
        batteryOn
          ? "border-surface-stroke bg-surface-card/60"
          : "border-slate-700 bg-slate-900/60"
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={{ color: batteryOn ? "#10B981" : "#475569" }}
            transition={{ duration: 0.3 }}
          >
            <BatteryCharging size={13} />
          </motion.div>
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
            Battery Setup
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Power size={11} className={batteryOn ? "text-battery" : "text-slate-500"} />
          <Switch
            checked={batteryOn}
            onCheckedChange={toggleBattery}
            aria-label="Toggle battery"
          />
        </div>
      </div>

      {/* Capacity pills */}
      <div className="flex gap-1 flex-wrap mb-1.5">
        {BATTERY_PRESETS.map((p) => {
          const isActive = p.isNone
            ? isNoneActive
            : (!isNoneActive && activePreset?.kwh === p.kwh && activePreset?.chemistry === p.chemistry);
          return (
            <button
              key={`${p.kwh}-${p.chemistry}`}
              onClick={() => handlePreset(p)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-all ${
                isActive
                  ? p.isNone
                    ? "border-slate-500 bg-slate-700/60 text-slate-300"
                    : "border-battery bg-battery/10 text-battery"
                  : "border-surface-stroke text-text-muted hover:border-battery/40"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* SoC slider — hidden when None selected */}
      {!isNoneActive && (
        <div className="space-y-0.5">
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-text-muted">SoC</span>
            <span
              className="text-[10px] font-bold tabular-nums"
              style={{ color: batteryOn ? socColor : "#475569" }}
            >
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
            disabled={!batteryOn}
            className="w-full h-1.5 disabled:opacity-40"
            style={{ accentColor: batteryOn ? socColor : "#475569" }}
            aria-label="Battery state of charge"
          />
          <div className="flex justify-between text-[8px] text-text-muted">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* Status line */}
      <div className="mt-1 text-[9px]" style={{ color: isNoneActive ? "#475569" : batteryOn ? "#10B981" : "#475569" }}>
        {isNoneActive
          ? "No battery — solar/grid only"
          : batteryOn
            ? `${batteryKwh} kWh ${batteryType === "lifepo4" ? "LFP" : "PbA"} — usable ~${(batteryKwh * (batteryType === "lifepo4" ? 0.9 : 0.5)).toFixed(1)} kWh`
            : "Battery disconnected — no charge/discharge"}
      </div>
    </div>
  );
}
