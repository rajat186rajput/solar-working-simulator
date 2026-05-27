"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Undo2, HelpCircle } from "lucide-react";
import { useSimStore } from "@/store/simulation-store";
import type { DayType } from "@/lib/types";
import { formatTime } from "@/lib/utils";

const DAY_TYPES: { value: DayType; label: string; icon: string }[] = [
  { value: "clear",   label: "Clear",   icon: "☀️" },
  { value: "cloudy",  label: "Cloudy",  icon: "⛅" },
  { value: "monsoon", label: "Monsoon", icon: "🌧️" },
];

const TIME_PRESETS: { label: string; icon: string; hour: number }[] = [
  { label: "Dawn",    icon: "🌅", hour: 6  },
  { label: "Morning", icon: "☀️", hour: 10 },
  { label: "Noon",    icon: "🌞", hour: 12 },
  { label: "Evening", icon: "🌆", hour: 17 },
  { label: "Night",   icon: "🌙", hour: 22 },
];

function LogoMark() {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <svg viewBox="0 0 40 40" width="24" height="24" fill="none" aria-label="SolarSim logo">
        <circle cx="20" cy="20" r="7" stroke="#F6C90E" strokeWidth="2" />
        {[45, 90, 135, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 20 + Math.cos(rad) * 9.5;
          const y1 = 20 + Math.sin(rad) * 9.5;
          const x2 = 20 + Math.cos(rad) * 13;
          const y2 = 20 + Math.sin(rad) * 13;
          return (
            <line
              key={deg}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#F6C90E"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
        <line x1="6" y1="20" x2="34" y2="20" stroke="#F6C90E" strokeWidth="2" />
        <circle cx="6" cy="20" r="1.5" fill="#F6C90E" />
        <circle cx="34" cy="20" r="1.5" fill="#F6C90E" />
      </svg>
      <span className="font-display font-semibold text-text-primary text-base hidden sm:block">
        SolarSim
      </span>
      <span className="font-display font-semibold text-text-primary text-base sm:hidden">
        SS
      </span>
    </div>
  );
}

export function TopBar() {
  const {
    resetToDefault,
    systemOffline,
    inverterOverload,
    systemStatus,
    timeHour,
    dayType,
    setTimeHour,
    setDayType,
  } = useSimStore();

  const hasAlert = systemOffline || inverterOverload;
  const isNight = timeHour < 5 || timeHour >= 19;

  return (
    <header className="flex items-center border-b border-surface-stroke bg-surface-dark/95 backdrop-blur-md shrink-0 px-3 sm:px-4 h-14 gap-2 sm:gap-3">

      {/* ── LEFT: Logo + optional alert badge ── */}
      <div className="flex items-center gap-2 shrink-0">
        <LogoMark />
        <AnimatePresence>
          {hasAlert && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="hidden lg:block px-2 py-0.5 rounded-full bg-danger/20 border border-danger/40 text-danger text-[10px] font-semibold truncate max-w-[140px]"
              title={systemStatus}
            >
              {systemStatus}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── DIVIDER ── */}
      <div className="w-px self-stretch bg-surface-stroke shrink-0 hidden sm:block" />

      {/* ── CENTER: Time display + time preset buttons ── */}
      <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1 overflow-hidden">
        {/* Clock readout */}
        <span className="text-[10px] font-bold text-text-primary tabular-nums shrink-0 w-[46px]">
          {formatTime(timeHour)}
          {isNight && <span className="text-text-muted font-normal"> nite</span>}
        </span>

        {/* Time preset buttons */}
        {TIME_PRESETS.map((preset) => {
          const isActive = timeHour === preset.hour;
          return (
            <button
              key={preset.hour}
              onClick={() => setTimeHour(preset.hour)}
              className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all shrink-0 ${
                isActive
                  ? "border-solar bg-solar/10 text-solar"
                  : "border-surface-stroke text-text-muted hover:border-surface-stroke/80"
              }`}
              aria-pressed={isActive}
              aria-label={`Set time to ${preset.label} (${formatTime(preset.hour)})`}
            >
              <span>{preset.icon}</span>
              <span className="hidden md:inline">{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── DIVIDER ── */}
      <div className="w-px self-stretch bg-surface-stroke shrink-0" />

      {/* ── RIGHT GROUP: Weather buttons + Reset + Help ── */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Weather buttons */}
        {DAY_TYPES.map((dt) => (
          <button
            key={dt.value}
            onClick={() => setDayType(dt.value)}
            className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
              dayType === dt.value
                ? "border-solar bg-solar/10 text-solar"
                : "border-surface-stroke text-text-muted hover:border-surface-stroke/80"
            }`}
            aria-pressed={dayType === dt.value}
            aria-label={`Set weather to ${dt.label}`}
          >
            <span>{dt.icon}</span>
            <span className="hidden lg:inline">{dt.label}</span>
          </button>
        ))}

        {/* Divider before actions */}
        <div className="w-px self-stretch bg-surface-stroke mx-0.5" />

        {/* Reset */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={resetToDefault}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-surface-stroke bg-surface-card/60 text-text-secondary hover:text-text-primary hover:border-solar/40 text-[11px] font-medium transition-colors"
          aria-label="Reset simulator"
          title="Reset to default state"
        >
          <Undo2 size={12} />
          <span className="hidden sm:inline">Reset</span>
        </motion.button>

        {/* Help */}
        <Link
          href="/learn"
          className="flex items-center justify-center w-8 h-8 rounded-full border border-surface-stroke bg-surface-card/60 text-text-secondary hover:text-solar hover:border-solar/40 transition-colors"
          aria-label="Learn — Solar guide"
          title="Learn: On-Grid vs Off-Grid vs Hybrid"
        >
          <HelpCircle size={15} />
        </Link>
      </div>
    </header>
  );
}
