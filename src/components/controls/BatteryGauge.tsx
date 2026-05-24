"use client";

import { motion } from "framer-motion";
import { useSimStore } from "@/store/simulation-store";
import { calcBackupHours } from "@/lib/simulation";
import type { BatteryType } from "@/lib/types";

const BATTERY_TYPES: { value: BatteryType; label: string }[] = [
  { value: "lifepo4", label: "LiFePO4 (90% DoD)" },
  { value: "lead-acid", label: "Lead-Acid (50% DoD)" },
];

export function BatteryGauge() {
  const {
    mode, batterySoc, batteryKwh, batteryType, loadW,
    batteryChargeW, batteryDischargeW,
    setBatteryType, setBatterySoc,
  } = useSimStore();

  const showBattery = mode === "off-grid" || mode === "hybrid";
  if (!showBattery) return null;

  const backupHours = calcBackupHours(batterySoc, batteryKwh, batteryType, loadW);
  const backupDisplay = backupHours > 24 ? "24+ hr" : `${backupHours.toFixed(1)} hr`;

  const socColor = batterySoc >= 0.8 ? "#22C55E"
    : batterySoc >= 0.4 ? "#EAB308"
    : batterySoc >= 0.2 ? "#F97316"
    : "#EF4444";

  const socLabel = batterySoc >= 0.8 ? "Fully charged"
    : batterySoc >= 0.4 ? "Adequate"
    : batterySoc >= 0.2 ? "Low — Khatam hone wali hai"
    : "Critical — Band ho jayegi!";

  return (
    <div className="rounded-xl border border-surface-stroke bg-surface-card p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-text-primary font-display">Battery</h3>
        <span className="text-xs text-text-muted">{batteryKwh} kWh</span>
      </div>

      {/* SoC progress bar */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-2xl font-bold tabular-nums" style={{ color: socColor }}>
            {Math.round(batterySoc * 100)}%
          </span>
          <span className="text-xs" style={{ color: socColor }}>{socLabel}</span>
        </div>
        <div className="h-3 bg-surface-dark rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: socColor }}
            animate={{ width: `${batterySoc * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Charge/discharge status */}
      {batteryChargeW > 0 && (
        <div className="text-xs text-battery flex items-center gap-1">
          <span>↑ Charging</span>
          <span className="font-bold">{Math.round(batteryChargeW)} W</span>
        </div>
      )}
      {batteryDischargeW > 0 && (
        <div className="text-xs text-battery-discharge flex items-center gap-1">
          <span>↓ Discharging</span>
          <span className="font-bold">{Math.round(batteryDischargeW)} W</span>
        </div>
      )}

      {/* Backup time */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-text-muted">Backup time (current load):</span>
        <span className="font-bold text-text-primary">{backupDisplay}</span>
      </div>

      {/* Chemistry selector */}
      <div>
        <div className="text-[10px] text-text-muted mb-1 uppercase tracking-wide">Battery Type</div>
        <div className="flex gap-2">
          {BATTERY_TYPES.map((bt) => (
            <button
              key={bt.value}
              onClick={() => setBatteryType(bt.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                batteryType === bt.value
                  ? "border-battery bg-battery/10 text-battery"
                  : "border-surface-stroke text-text-muted"
              }`}
            >
              {bt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Manual SoC control */}
      <div>
        <div className="text-[10px] text-text-muted mb-1">Set Battery SoC</div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(batterySoc * 100)}
          onChange={(e) => setBatterySoc(parseInt(e.target.value) / 100)}
          className="w-full accent-battery h-2"
          aria-label="Battery state of charge"
        />
        <div className="flex justify-between text-[9px] text-text-muted mt-0.5">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}
