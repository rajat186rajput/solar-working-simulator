"use client";

import { useSimStore } from "@/store/simulation-store";
import type { DayType } from "@/lib/types";
import { formatTime } from "@/lib/utils";

const DAY_TYPES: { value: DayType; label: string; icon: string }[] = [
  { value: "clear",   label: "Clear",   icon: "☀️" },
  { value: "cloudy",  label: "Cloudy",  icon: "⛅" },
  { value: "monsoon", label: "Monsoon", icon: "🌧️" },
];

const TIME_PRESETS: { label: string; icon: string; hour: number }[] = [
  { label: "Dawn",      icon: "🌅", hour: 6  },
  { label: "Morning",   icon: "☀️", hour: 10 },
  { label: "Afternoon", icon: "🌞", hour: 14 },
  { label: "Evening",   icon: "🌆", hour: 17 },
  { label: "Night",     icon: "🌙", hour: 22 },
];

export function TopStrip() {
  const { timeHour, dayType, setTimeHour, setDayType } = useSimStore();

  const isNight = timeHour < 5 || timeHour >= 19;

  return (
    <div className="w-full shrink-0 h-14 flex items-center px-3 sm:px-4 gap-3 border-b border-surface-stroke bg-surface-dark/80 backdrop-blur-sm">

      {/* ── TIME PRESETS (left) ── */}
      <div className="flex-1 flex items-center gap-1.5 min-w-0 flex-wrap">
        {/* Time display */}
        <span className="text-xs font-bold text-text-primary tabular-nums shrink-0 w-[52px]">
          {formatTime(timeHour)}
          {isNight && <span className="text-text-muted font-normal"> nite</span>}
        </span>

        {/* Named segment buttons */}
        {TIME_PRESETS.map((preset) => {
          const isActive = timeHour === preset.hour;
          return (
            <button
              key={preset.hour}
              onClick={() => setTimeHour(preset.hour)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                isActive
                  ? "border-solar bg-solar/10 text-solar"
                  : "border-surface-stroke text-text-muted hover:border-surface-stroke/80"
              }`}
              aria-pressed={isActive}
              aria-label={`Set time to ${preset.label} (${formatTime(preset.hour)})`}
            >
              <span>{preset.icon}</span>
              <span className="hidden sm:inline">{preset.label}</span>
            </button>
          );
        })}
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
