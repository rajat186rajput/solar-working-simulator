"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Zap, ZapOff } from "lucide-react";
import { useSimStore } from "@/store/simulation-store";
import type { DayType } from "@/lib/types";
import { getDaySparkline } from "@/lib/solar-curve";
import { formatTime } from "@/lib/utils";
import { ScenarioPills } from "./ScenarioPills";
import {
  LineChart, Line, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";

const DAY_TYPES: { value: DayType; label: string; icon: string }[] = [
  { value: "clear", label: "Clear", icon: "☀️" },
  { value: "cloudy", label: "Cloudy", icon: "⛅" },
  { value: "monsoon", label: "Monsoon", icon: "🌧️" },
];

const TIME_GRADIENTS: Record<number, string[]> = {
  5:  ["#1a0a2e", "#3d1f6b", "#a0522d"],
  7:  ["#f97316", "#fb923c", "#fbbf24"],
  10: ["#fbbf24", "#fde68a", "#ffffff"],
  12: ["#e0f2fe", "#ffffff", "#fef9c3"],
  15: ["#fde68a", "#fb923c", "#f97316"],
  18: ["#f97316", "#dc2626", "#7c3aed"],
  20: ["#1e1b4b", "#0f172a", "#020617"],
};

function getGradientForHour(hour: number): string[] {
  const hours = Object.keys(TIME_GRADIENTS).map(Number).sort((a, b) => a - b);
  let prev = hours[0];
  for (const h of hours) {
    if (hour <= h) break;
    prev = h;
  }
  return TIME_GRADIENTS[prev] || TIME_GRADIENTS[20];
}

export function ControlsPanel() {
  const {
    timeHour, dayType, panelKwp, setTimeHour, setDayType,
    mode, gridAvailable, setGridAvailable,
    batterySoc, setBatterySoc,
    batteryType, setBatteryType,
  } = useSimStore();

  const showBattery = mode === "off-grid" || mode === "hybrid";
  const showGrid = mode !== "off-grid";
  const sparkData = getDaySparkline(dayType, panelKwp);
  const gradColors = getGradientForHour(timeHour);
  const isNight = timeHour < 5 || timeHour >= 19;
  const sunProgress = Math.max(0, Math.min(1, (timeHour - 5) / (19 - 5)));

  return (
    <div className="flex flex-col h-full gap-2 overflow-y-auto pr-0.5">
      {/* === TIME OF DAY === */}
      <div className="rounded-xl border border-surface-stroke bg-surface-card/60 p-2.5 space-y-1.5 flex-shrink-0">
        {/* Sparkline */}
        <div className="h-10 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="watts"
                stroke="#F6C90E"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 8, fill: "#475569" }}
                tickLine={false}
                axisLine={false}
                interval={3}
              />
              <RechartsTooltip
                contentStyle={{
                  background: "#1E293B",
                  border: "1px solid #334155",
                  borderRadius: 6,
                  fontSize: 10,
                  color: "#F1F5F9",
                }}
                formatter={(val) => [`${Math.round(Number(val ?? 0))} W`, "Solar"]}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sky gradient + time display */}
        <div className="relative">
          <motion.div
            animate={{ background: `linear-gradient(to right, ${gradColors.join(", ")})` }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="h-7 rounded-full w-full flex items-center justify-center"
          >
            <span className="text-xs font-bold text-white drop-shadow-md">
              {formatTime(timeHour)}
              {isNight && <span className="ml-1 opacity-80">— Night</span>}
            </span>
          </motion.div>
          {/* Sun/Moon */}
          <div className="absolute -top-4 w-full flex items-center px-2 pointer-events-none">
            <motion.span
              style={{ position: "absolute", left: `${sunProgress * 88}%` }}
              animate={{ opacity: timeHour >= 5 && timeHour < 19 ? 1 : 0 }}
              transition={{ duration: 0.4 }}
              className="text-base"
            >
              ☀️
            </motion.span>
            <motion.span
              style={{ position: "absolute", right: "4%" }}
              animate={{ opacity: isNight ? 1 : 0 }}
              transition={{ duration: 0.4 }}
              className="text-base"
            >
              🌙
            </motion.span>
          </div>
        </div>

        {/* Time slider */}
        <Slider
          min={5}
          max={23}
          step={1}
          value={[timeHour]}
          onValueChange={(vals) => {
            const v = Array.isArray(vals) ? vals[0] : vals;
            setTimeHour(v as number);
          }}
          aria-label="Time of day"
          className="w-full"
        />
        <div className="flex justify-between text-[9px] text-text-muted -mt-0.5">
          <span>5 AM</span>
          <span>12 PM</span>
          <span>11 PM</span>
        </div>

        {/* Day type */}
        <div className="flex gap-1.5">
          {DAY_TYPES.map((dt) => (
            <button
              key={dt.value}
              onClick={() => setDayType(dt.value)}
              className={`flex-1 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                dayType === dt.value
                  ? "border-solar bg-solar/10 text-solar"
                  : "border-surface-stroke text-text-muted hover:border-surface-stroke/80"
              }`}
            >
              {dt.icon} {dt.label}
            </button>
          ))}
        </div>
      </div>

      {/* === BATTERY SOC (only in battery modes) === */}
      {showBattery && (
        <div className="rounded-xl border border-surface-stroke bg-surface-card/60 p-2.5 flex-shrink-0 space-y-1.5">
          <div className="flex justify-between items-center">
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Battery SoC</div>
            <div className="flex gap-1">
              {[
                { value: "lifepo4" as const, label: "LFP" },
                { value: "lead-acid" as const, label: "PbA" },
              ].map((bt) => (
                <button
                  key={bt.value}
                  onClick={() => setBatteryType(bt.value)}
                  className={`px-2 py-0.5 rounded text-[9px] font-medium border transition-all ${
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
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(batterySoc * 100)}
            onChange={(e) => setBatterySoc(parseInt(e.target.value) / 100)}
            className="w-full accent-battery h-1.5"
            aria-label="Battery state of charge"
          />
          <div className="flex justify-between text-[9px] text-text-muted -mt-0.5">
            <span>0%</span>
            <span className="font-bold text-battery">{Math.round(batterySoc * 100)}%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* === GRID TOGGLE === */}
      {showGrid && (
        <div
          className={`rounded-xl border p-2.5 flex-shrink-0 transition-all ${
            gridAvailable
              ? "border-surface-stroke bg-surface-card/60"
              : "border-danger bg-danger/5"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <AnimatePresence mode="wait">
                {gridAvailable ? (
                  <motion.div key="on" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Zap size={14} className="text-grid flex-shrink-0" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="off"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, x: [0, -2, 2, -2, 2, 0] }}
                    exit={{ scale: 0 }}
                    transition={{ x: { duration: 0.4 } }}
                  >
                    <ZapOff size={14} className="text-danger flex-shrink-0" />
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="min-w-0">
                <div className="text-xs font-medium text-text-primary truncate">Grid — UPPCL</div>
                <div
                  className={`text-[10px] font-medium ${
                    gridAvailable ? "text-grid" : "text-danger"
                  }`}
                >
                  {gridAvailable ? "Available ✅" : "FAILED ❌"}
                </div>
              </div>
            </div>
            <Switch
              checked={gridAvailable}
              onCheckedChange={setGridAvailable}
              aria-label="Toggle grid availability"
            />
          </div>
          {!gridAvailable && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-1.5 text-[10px] text-danger/80 leading-relaxed"
            >
              {mode === "on-grid"
                ? "Anti-islanding relay fire — solar bhi band."
                : "Battery + Solar — load continue."}
            </motion.div>
          )}
        </div>
      )}

      {/* Off-grid note */}
      {!showGrid && (
        <div className="rounded-xl border border-surface-stroke bg-surface-card/60 p-2.5 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-text-muted text-[10px]">
            <ZapOff size={12} />
            <span>Off-Grid — no grid connection</span>
          </div>
        </div>
      )}

      {/* === SCENARIOS === */}
      <div className="rounded-xl border border-surface-stroke bg-surface-card/60 p-2.5 flex-shrink-0">
        <ScenarioPills />
      </div>
    </div>
  );
}
