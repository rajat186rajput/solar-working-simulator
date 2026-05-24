"use client";

import { motion } from "framer-motion";
import { useSimStore } from "@/store/simulation-store";
import type { Mode } from "@/lib/types";

const MODES: { value: Mode; label: string }[] = [
  { value: "on-grid", label: "On-Grid" },
  { value: "off-grid", label: "Off-Grid" },
  { value: "hybrid", label: "Hybrid" },
];

export function ModeToggle() {
  const { mode, setMode } = useSimStore();

  return (
    <div
      role="tablist"
      aria-label="Solar system mode"
      className="relative flex items-center bg-surface-card rounded-full p-1 gap-1 border border-surface-stroke"
    >
      {MODES.map((m) => (
        <button
          key={m.value}
          role="tab"
          aria-selected={mode === m.value}
          onClick={() => setMode(m.value)}
          className="relative z-10 px-4 py-2 rounded-full text-sm font-medium transition-colors min-w-[80px] sm:min-w-[90px]"
          style={{
            color: mode === m.value ? "#F6C90E" : "#94A3B8",
          }}
        >
          {mode === m.value && (
            <motion.div
              layoutId="mode-highlight"
              className="absolute inset-0 rounded-full bg-solar/20 border border-solar/60"
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            />
          )}
          <span className="relative z-10">{m.label}</span>
        </button>
      ))}
    </div>
  );
}
