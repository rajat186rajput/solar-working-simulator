"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Undo2, HelpCircle, ChevronDown } from "lucide-react";
import { useSimStore } from "@/store/simulation-store";
import { calcBackupHours } from "@/lib/simulation";
import { formatWh } from "@/lib/utils";
import type { Mode } from "@/lib/types";

const MODES: { value: Mode; label: string; icon: string }[] = [
  { value: "on-grid",  label: "On-Grid",  icon: "🔌" },
  { value: "off-grid", label: "Off-Grid", icon: "🔆" },
  { value: "hybrid",   label: "Hybrid",   icon: "⚡" },
];

function LogoMark() {
  return (
    <div className="flex items-center gap-2">
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

// ─── Mini-stat tile (read-only display) ────────────────────────────────────
interface MiniStatProps {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  barFill?: number;   // 0–1, optional inline bar
  barColor?: string;
}

function MiniStat({ icon, label, value, valueColor = "#F1F5F9", barFill, barColor }: MiniStatProps) {
  return (
    <div className="flex flex-col items-start gap-0 flex-shrink-0 px-3 first:pl-0">
      <div className="flex items-center gap-1">
        <span className="text-[11px] leading-none flex-shrink-0">{icon}</span>
        <span className="text-[9px] text-text-muted uppercase tracking-wide leading-none whitespace-nowrap">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span
          className="text-sm font-bold tabular-nums leading-none whitespace-nowrap"
          style={{ color: valueColor }}
        >
          {value}
        </span>
        {/* Inline bar for battery */}
        {barFill !== undefined && (
          <div className="w-12 h-1.5 bg-surface-dark rounded-full overflow-hidden shrink-0">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: barColor ?? "#22C55E" }}
              animate={{ width: `${Math.max(0, Math.min(1, barFill)) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vertical divider ──────────────────────────────────────────────────────
function Divider() {
  return <div className="w-px self-stretch bg-surface-stroke mx-1 shrink-0" />;
}

// ─── Mode dropdown button ───────────────────────────────────────────────────
function ModeDropdown() {
  const { mode, setMode } = useSimStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const current = MODES.find((m) => m.value === mode) ?? MODES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-stroke bg-surface-card/80 text-text-primary hover:border-solar/50 hover:bg-surface-card text-sm font-semibold transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select solar system mode"
      >
        <span>{current.icon}</span>
        <span className="tabular-nums">{current.label}</span>
        <ChevronDown
          size={13}
          className="text-text-muted shrink-0 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 min-w-[140px] rounded-xl border border-surface-stroke bg-surface-card shadow-lg overflow-hidden"
            role="listbox"
            aria-label="Solar system mode"
          >
            {MODES.map((m) => (
              <button
                key={m.value}
                role="option"
                aria-selected={mode === m.value}
                onClick={() => { setMode(m.value); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  mode === m.value
                    ? "bg-solar/15 text-solar"
                    : "text-text-secondary hover:bg-surface-dark/60 hover:text-text-primary"
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
                {mode === m.value && (
                  <span className="ml-auto text-solar text-xs">✓</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TopBar() {
  const {
    resetToDefault,
    systemOffline,
    inverterOverload,
    systemStatus,
    solarW,
    loadW,
    batterySoc,
    batteryOn,
    batteryKwh,
    batteryType,
    gridAvailable,
    netMeterWh,
    mode,
  } = useSimStore();

  const hasAlert = systemOffline || inverterOverload;

  const showBattery = mode === "off-grid" || mode === "hybrid";
  const showGrid = mode === "on-grid" || mode === "hybrid";

  const backupHours = showBattery && batteryOn && batteryKwh > 0
    ? calcBackupHours(batterySoc, batteryKwh, batteryType, loadW)
    : 0;

  const backupDisplay =
    !showBattery
      ? "N/A"
      : !batteryOn || batteryKwh <= 0
      ? "—"
      : backupHours > 24
      ? "24+ hr"
      : `${backupHours.toFixed(1)} hr`;

  const socColor =
    batterySoc >= 0.8 ? "#22C55E"
    : batterySoc >= 0.4 ? "#EAB308"
    : batterySoc >= 0.2 ? "#F97316"
    : "#EF4444";

  const backupColor =
    !showBattery || !batteryOn || batteryKwh <= 0
      ? "#475569"
      : backupHours > 4
      ? "#22C55E"
      : backupHours > 1
      ? "#EAB308"
      : "#EF4444";

  return (
    <header className="flex flex-col border-b border-surface-stroke bg-surface-dark/95 backdrop-blur-md shrink-0">
      {/* ── ROW 1: Logo | Mode Toggle | Reset + Help ── */}
      <div className="flex items-center justify-between px-3 sm:px-4 h-14 gap-2">
        {/* Left — logo */}
        <div className="flex items-center gap-3 min-w-0 w-1/4">
          <LogoMark />
          {/* Status badge — only on large screens */}
          <AnimatePresence>
            {hasAlert && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="hidden lg:block px-2 py-0.5 rounded-full bg-danger/20 border border-danger/40 text-danger text-[10px] font-semibold truncate max-w-[160px]"
                title={systemStatus}
              >
                {systemStatus}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Center — Mode Dropdown */}
        <div className="flex justify-center flex-1">
          <ModeDropdown />
        </div>

        {/* Right — Reset + Help */}
        <div className="flex items-center gap-1.5 w-1/4 justify-end">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetToDefault}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-surface-stroke bg-surface-card/60 text-text-secondary hover:text-text-primary hover:border-solar/40 text-[11px] font-medium transition-colors"
            aria-label="Reset simulator"
            title="Reset to default state"
          >
            <Undo2 size={12} />
            <span className="hidden sm:inline">Reset</span>
          </motion.button>

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

      {/* ── ROW 2: Live stat strip (6 stats) ~50px ── */}
      <div className="flex items-center px-3 sm:px-4 h-[50px] gap-0 border-t border-surface-stroke/50 bg-surface-card/20 overflow-x-auto">
        {/* 1 — Solar W */}
        <MiniStat
          icon="☀️"
          label="Solar"
          value={`${Math.round(solarW)} W`}
          valueColor="#F6C90E"
        />
        <Divider />

        {/* 2 — Load W */}
        <MiniStat
          icon="⚡"
          label="Load"
          value={`${Math.round(loadW)} W`}
          valueColor={loadW > 6200 ? "#EF4444" : "#F97316"}
        />
        <Divider />

        {/* 3 — Battery % + bar */}
        {showBattery ? (
          <>
            <MiniStat
              icon="🔋"
              label="Battery"
              value={batteryOn && batteryKwh > 0 ? `${Math.round(batterySoc * 100)}%` : "—"}
              valueColor={batteryOn && batteryKwh > 0 ? socColor : "#475569"}
              barFill={batteryOn && batteryKwh > 0 ? batterySoc : 0}
              barColor={socColor}
            />
            <Divider />
          </>
        ) : (
          <>
            <MiniStat
              icon="🔋"
              label="Battery"
              value="N/A"
              valueColor="#475569"
            />
            <Divider />
          </>
        )}

        {/* 4 — Grid status */}
        {showGrid ? (
          <>
            <MiniStat
              icon={gridAvailable ? "🔌" : "❌"}
              label="Grid"
              value={gridAvailable ? "OK" : "OFF"}
              valueColor={gridAvailable ? "#3B82F6" : "#EF4444"}
            />
            <Divider />
          </>
        ) : (
          <>
            <MiniStat
              icon="🔌"
              label="Grid"
              value="Off-Grid"
              valueColor="#475569"
            />
            <Divider />
          </>
        )}

        {/* 5 — Net Meter Wh today */}
        <MiniStat
          icon="📊"
          label="Net Meter"
          value={formatWh(netMeterWh)}
          valueColor={netMeterWh >= 0 ? "#22C55E" : "#EF4444"}
        />
        <Divider />

        {/* 6 — Backup hours */}
        <MiniStat
          icon="⏱"
          label="Backup"
          value={backupDisplay}
          valueColor={backupColor}
        />
      </div>
    </header>
  );
}
