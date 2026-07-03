"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { useSimStore } from "@/store/simulation-store";

const INVERTER_PRESETS: { label: string; watts: number }[] = [
  { label: "3 kW",   watts: 3000  },
  { label: "5 kW",   watts: 5000  },
  { label: "6.2 kW", watts: 6200  },
  { label: "10 kW",  watts: 10000 },
];

export function InverterSetupCard() {
  const { inverterWatts, setInverterWatts, gridAvailable, mode } = useSimStore();

  // Overload only bites when grid can't backstop (off-grid, or grid-fail in hybrid/on-grid)
  const gridCanBackstop = gridAvailable && (mode === "on-grid" || mode === "hybrid");

  return (
    <div className="rounded-xl border border-surface-stroke bg-surface-card/60 p-2 flex-shrink-0 transition-all">
      {/* Header row — no on/off switch, inverter is always present */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <motion.div animate={{ color: "#22D3EE" }} transition={{ duration: 0.3 }}>
            <Zap size={13} />
          </motion.div>
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
            Inverter Setup
          </span>
        </div>
      </div>

      {/* Capacity pills */}
      <div className="flex gap-1 flex-wrap">
        {INVERTER_PRESETS.map((p) => (
          <button
            key={p.watts}
            onClick={() => setInverterWatts(p.watts)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-all ${
              inverterWatts === p.watts
                ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                : "border-surface-stroke text-text-muted hover:border-cyan-400/40"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Status line */}
      <div className="mt-1 text-[9px] text-cyan-300/80">
        {gridCanBackstop
          ? `${(inverterWatts / 1000).toFixed(1)} kW rated — grid backs up any overload`
          : `${(inverterWatts / 1000).toFixed(1)} kW rated — load above this trips it (no grid backstop)`}
      </div>
    </div>
  );
}
