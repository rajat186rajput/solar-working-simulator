"use client";

import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { useSimStore } from "@/store/simulation-store";
import type { DayType } from "@/lib/types";
import { formatTime } from "@/lib/utils";

const DAY_TYPES: { value: DayType; label: string; icon: string }[] = [
  { value: "clear",   label: "Clear",   icon: "☀️" },
  { value: "cloudy",  label: "Cloudy",  icon: "⛅" },
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
  return TIME_GRADIENTS[prev] ?? TIME_GRADIENTS[20]!;
}

export function TopStrip() {
  const { timeHour, dayType, setTimeHour, setDayType } = useSimStore();

  const gradColors  = getGradientForHour(timeHour);
  const isNight     = timeHour < 5 || timeHour >= 19;
  const sunProgress = Math.max(0, Math.min(1, (timeHour - 5) / (19 - 5)));

  return (
    <div className="w-full shrink-0 h-14 flex items-center px-3 sm:px-4 gap-3 border-b border-surface-stroke bg-surface-dark/80 backdrop-blur-sm">

      {/* ── TIME SLIDER (left ~60%) ── */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {/* Sun/Moon + time display */}
        <div className="relative shrink-0" style={{ width: 44, height: 32 }}>
          <motion.div
            animate={{ background: `linear-gradient(to bottom, ${gradColors.join(", ")})` }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-0 rounded-lg"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              animate={{ opacity: !isNight ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="text-base absolute"
              style={{ left: `${sunProgress * 55}%` }}
            >
              ☀️
            </motion.span>
            <motion.span
              animate={{ opacity: isNight ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="text-base absolute right-1"
            >
              🌙
            </motion.span>
          </div>
        </div>

        {/* Time label */}
        <span className="text-xs font-bold text-text-primary tabular-nums shrink-0 w-[52px]">
          {formatTime(timeHour)}
          {isNight && <span className="text-text-muted font-normal"> nite</span>}
        </span>

        {/* Slider */}
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
          className="flex-1 min-w-0"
        />

        {/* Range labels */}
        <div className="hidden sm:flex flex-col items-end shrink-0">
          <span className="text-[9px] text-text-muted leading-none">5 AM</span>
          <span className="text-[9px] text-text-muted leading-none">11 PM</span>
        </div>
      </div>

      {/* ── VERTICAL DIVIDER ── */}
      <div className="w-px self-stretch bg-surface-stroke shrink-0" />

      {/* ── WEATHER BUTTONS (right ~40%) ── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {DAY_TYPES.map((dt) => (
          <button
            key={dt.value}
            onClick={() => setDayType(dt.value)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
              dayType === dt.value
                ? "border-solar bg-solar/10 text-solar"
                : "border-surface-stroke text-text-muted hover:border-surface-stroke/80"
            }`}
          >
            <span>{dt.icon}</span>
            <span className="hidden sm:inline">{dt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
