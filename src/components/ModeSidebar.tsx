"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSimStore } from "@/store/simulation-store";
import type { Mode } from "@/lib/types";

const MODES: {
  value: Mode;
  icon: string;
  label: string;
  description: string;
}[] = [
  {
    value: "on-grid",
    icon: "🔌",
    label: "On-Grid",
    description: "Connected to UPPCL grid. Solar + grid power your home. No battery.",
  },
  {
    value: "off-grid",
    icon: "🔆",
    label: "Off-Grid",
    description: "Fully independent. Solar + battery only. No grid connection.",
  },
  {
    value: "hybrid",
    icon: "⚡",
    label: "Hybrid",
    description: "Best of both. Solar + battery + grid. Auto-switches on grid failure.",
  },
];

export function ModeSidebar() {
  const { mode, setMode } = useSimStore();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── Toggle tab (fixed, left-center) ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close simulation mode panel" : "Open simulation mode panel"}
        aria-expanded={open}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center w-5 h-14 rounded-r-lg bg-surface-card border border-l-0 border-surface-stroke text-text-muted hover:text-solar hover:border-solar/40 transition-colors"
        style={{ boxShadow: "2px 0 8px rgba(0,0,0,0.4)" }}
      >
        <span
          className="text-[11px] font-bold select-none transition-transform"
          style={{ transform: open ? "none" : "none" }}
        >
          {open ? "◀" : "▶"}
        </span>
      </button>

      {/* ── Sliding panel ── */}
      <AnimatePresence>
        {open && (
          <motion.aside
            key="mode-sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.22, ease: "easeInOut" }}
            className="fixed left-0 top-0 h-full z-30 w-60 bg-surface-dark border-r border-surface-stroke shadow-2xl flex flex-col pt-16 pb-6 px-4 gap-4"
            aria-label="Simulation mode selector"
          >
            <div className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-1">
              Simulation Mode
            </div>

            {MODES.map((m) => {
              const isActive = mode === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => { setMode(m.value); setOpen(false); }}
                  aria-pressed={isActive}
                  className={`flex flex-col items-start gap-1 w-full rounded-xl border px-4 py-3 text-left transition-all ${
                    isActive
                      ? "border-solar bg-solar/10 text-solar"
                      : "border-surface-stroke bg-surface-card/40 text-text-secondary hover:border-solar/30 hover:text-text-primary"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
                    {isActive && (
                      <span className="ml-auto text-solar text-xs">✓</span>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-70">{m.description}</p>
                </button>
              );
            })}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Click-away backdrop (subtle) ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mode-sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-20 bg-black/30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
    </>
  );
}
