"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Undo2, HelpCircle } from "lucide-react";
import { useSimStore } from "@/store/simulation-store";
import type { DayType } from "@/lib/types";
import { formatTime } from "@/lib/utils";
import { L, type LabelKey } from "@/lib/i18n";

type TimePreset = { key: LabelKey; icon: string; hour: number };

const TIME_PRESETS: TimePreset[] = [
  { key: "dawn",    icon: "🌅", hour: 6  },
  { key: "morning", icon: "☀️", hour: 10 },
  { key: "noon",    icon: "🌞", hour: 12 },
  { key: "evening", icon: "🌆", hour: 17 },
  { key: "night",   icon: "🌙", hour: 22 },
];

type DayTypePreset = { value: DayType; key: LabelKey; icon: string };

const DAY_TYPES: DayTypePreset[] = [
  { value: "clear",   key: "clear",   icon: "☀️" },
  { value: "cloudy",  key: "cloudy",  icon: "⛅" },
  { value: "monsoon", key: "monsoon", icon: "🌧️" },
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
    lang,
    setLang,
    simView,
    setSimView,
    overloadBand,
    batteryAtDodFloor,
  } = useSimStore();

  // F.3 — reuse the existing hasAlert badge for the Real Setup overload bands
  // too (amber/red pre-trip states), not just the hard systemOffline/trip case.
  // R5 (code review): also alert on the lead-acid 50% DoD floor — otherwise an
  // "empty" real-setup battery is invisible in the TopBar.
  const hasAlert =
    systemOffline || inverterOverload ||
    (simView === "real-setup" && (overloadBand !== "none" || batteryAtDodFloor));
  const isNight = timeHour < 5 || timeHour >= 19;

  return (
    // GATE-1 fix: ModeSidebar's click-away backdrop is `fixed inset-0 z-20`
    // and TopBar previously had no z-index — an un-positioned element always
    // renders BELOW any positioned descendant regardless of DOM order, so the
    // backdrop silently intercepted clicks on TopBar (lang toggle, Reset,
    // weather chips) whenever the sidebar was open. This was always latent
    // (the sidebar could always be opened manually) but only got exercised
    // once auto-open (item 7) started opening it automatically. `relative
    // z-50` keeps TopBar clickable above the sidebar/backdrop/handle (z-30/
    // z-20/z-40) at all times — matches the sidebar's own `pt-16` spacing,
    // which already assumed the header stays visible on top.
    <header
      className="relative z-50 flex flex-col md:flex-row shrink-0"
      style={{
        background: "linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.97) 100%)",
        borderBottom: "1px solid transparent",
        borderImage: "linear-gradient(90deg, transparent 0%, #3B82F6 30%, #F59E0B 70%, transparent 100%) 1",
      }}
    >
      {/* ── ROW 1: Logo + alert badge (left) + Lang toggle + Reset + Help (right) ── */}
      <div className="flex items-center h-10 px-3 sm:px-4 gap-2 backdrop-blur-md">
        {/* Logo */}
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

        {/* Learn ⇄ Real Setup — House No. 89 segmented switch (Section A) */}
        <div
          role="group"
          aria-label={L(lang, "realSetupAria")}
          className="flex items-center gap-0.5 bg-surface-card rounded-lg p-0.5 border border-surface-stroke shrink-0"
        >
          <button
            onClick={() => setSimView("learn")}
            aria-pressed={simView === "learn"}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
              simView === "learn"
                ? "border border-solar bg-solar/10 text-solar"
                : "border border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            <span className="sm:hidden">📖</span>
            <span>{L(lang, "learnMode")}</span>
          </button>
          <button
            onClick={() => setSimView("real-setup")}
            aria-pressed={simView === "real-setup"}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
              simView === "real-setup"
                ? "border border-solar bg-solar/10 text-solar"
                : "border border-transparent text-text-muted hover:text-text-primary"
            }`}
            style={simView === "real-setup" ? { boxShadow: "0 0 10px rgba(246,201,14,0.40)" } : undefined}
          >
            <span className="sm:hidden">🏠</span>
            <span className="hidden sm:inline">{L(lang, "realSetupMode")}</span>
            <span className="sm:hidden">{L(lang, "realSetupShort")}</span>
          </button>
        </div>

        {/* Spacer — pushes controls to right on row 1 */}
        <div className="flex-1 md:hidden" />

        {/* On desktop row 1 merges with row 2 via flex-row — divider shown md+ */}
        <div className="w-px self-stretch bg-surface-stroke shrink-0 hidden md:block" />

        {/* Right controls — always visible in row 1 on mobile, part of single row on desktop */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto md:ml-0">
          {/* LEAD-1 (code review): the weather chips lived in TWO places at md+ —
              here AND in ROW 2 below (which is unconditionally rendered at every
              breakpoint, not just mobile). ROW 2 is the single source of truth
              for weather at all widths; this duplicate desktop copy is removed. */}

          {/* Divider before lang */}
          <div className="w-px self-stretch bg-surface-stroke mx-0.5" />

          {/* Language toggle pill */}
          <div
            className="flex items-center gap-0.5 bg-surface-card rounded-lg p-0.5 border border-surface-stroke"
            aria-label="Language toggle"
          >
            <button
              onClick={() => setLang("en")}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                lang === "en"
                  ? "bg-solar text-black font-semibold"
                  : "text-text-muted hover:text-text-primary"
              }`}
              aria-pressed={lang === "en"}
              aria-label="Switch to English"
            >
              EN
            </button>
            <button
              onClick={() => setLang("hi")}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                lang === "hi"
                  ? "bg-solar text-black font-semibold"
                  : "text-text-muted hover:text-text-primary"
              }`}
              aria-pressed={lang === "hi"}
              aria-label="Switch to Hindi"
            >
              हिं
            </button>
          </div>

          {/* Divider before reset/help */}
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
            <span className="hidden sm:inline">{L(lang, "reset")}</span>
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
      </div>

      {/* ── ROW 2 (mobile) / CENTER section (desktop): Time display + presets + weather ── */}
      {/*
        Mobile: full-width row, scrollable, borderTop separator
        Desktop (md+): flex-1 center section within the single-row flex-row layout
                       The row 2 div becomes the center piece between logo-row and right-controls.
                       We achieve this by: on md+ the header is flex-row, row1 is flex-row too,
                       so we need row2 to behave as flex-1 in the md+ context.
                       Strategy: row2 is always rendered; on md+ it is inserted in the flex-row
                       flow by ordering — but since row1 contains left AND right, we use
                       CSS order to slot it between them on desktop.
      */}
      {/* GATE-1 (Rajat: time-of-day row clipped on mobile, "Nig…" cut off) —
          sizing/border classes moved onto this outer `relative` wrapper (was
          on the scrollable div itself) so a right-edge fade can be an
          absolutely-positioned SIBLING of the scrollable content — sitting
          on top of it instead of scrolling away with it — signalling "more
          chips this way" on mobile instead of the row just looking cut off
          mid-chip. The row itself was already horizontally scrollable; this
          only adds the affordance. Desktop flex-1/border behaviour unchanged. */}
      <div className="relative md:flex-1 md:border-l md:border-r md:border-surface-stroke">
        <div
          className={[
            // Mobile: second row, full width, scrollable
            "flex items-center h-10 px-3 gap-1 overflow-x-auto scrollbar-none",
            "border-t border-surface-stroke/30",
            // Desktop: becomes the center flex-1 piece
            "md:border-t-0 md:justify-center",
            "backdrop-blur-md",
          ].join(" ")}
        >
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
              className={`flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[10px] font-medium border transition-all shrink-0 ${
                isActive
                  ? "border-solar bg-solar/10 text-solar btn-neon-solar"
                  : "border-surface-stroke text-text-muted hover:border-surface-stroke/80"
              }`}
              style={isActive ? { boxShadow: "0 0 10px rgba(246,201,14,0.45)" } : undefined}
              aria-pressed={isActive}
              aria-label={`Set time to ${L(lang, preset.key)} (${formatTime(preset.hour)})`}
            >
              <span>{preset.icon}</span>
              {/* Show label always (emoji + text) — no hidden class */}
              <span className="ml-0.5">{L(lang, preset.key)}</span>
            </button>
          );
        })}

        {/* Divider between time presets and weather */}
        <div className="w-px self-stretch bg-surface-stroke shrink-0 mx-1" />

        {/* Weather buttons — always visible in row 2 */}
        {DAY_TYPES.map((dt) => (
          <button
            key={dt.value}
            onClick={() => setDayType(dt.value)}
            className={`flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[10px] font-medium border transition-all shrink-0 ${
              dayType === dt.value
                ? "border-solar bg-solar/10 text-solar"
                : "border-surface-stroke text-text-muted hover:border-surface-stroke/80"
            }`}
            style={dayType === dt.value ? { boxShadow: "0 0 10px rgba(246,201,14,0.40)" } : undefined}
            aria-pressed={dayType === dt.value}
            aria-label={`Set weather to ${L(lang, dt.key)}`}
          >
            <span>{dt.icon}</span>
            <span className="ml-0.5 hidden md:inline">{L(lang, dt.key)}</span>
          </button>
        ))}
        </div>
        {/* Right-edge scroll fade — mobile only, hidden once desktop content fits without scrolling */}
        <div
          className="md:hidden pointer-events-none absolute right-0 top-0 bottom-0 w-6"
          style={{ background: "linear-gradient(to right, transparent, rgba(15,23,42,0.92))" }}
          aria-hidden="true"
        />
      </div>
    </header>
  );
}
