"use client";

import { motion } from "framer-motion";
import { Sun, Power } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useSimStore } from "@/store/simulation-store";

const SOLAR_PRESETS: { label: string; kwp: number }[] = [
  { label: "2 kWp",   kwp: 2   },
  { label: "4.4 kWp", kwp: 4.4 },
  { label: "5 kWp",   kwp: 5   },
  { label: "7 kWp",   kwp: 7   },
  { label: "10 kWp",  kwp: 10  },
];

export function SolarSetupCard() {
  const { panelKwp, setPanelKwp, solarOn, toggleSolar } = useSimStore();

  return (
    <div
      className={`rounded-xl border p-2 flex-shrink-0 transition-all ${
        solarOn
          ? "border-surface-stroke bg-surface-card/60"
          : "border-slate-700 bg-slate-900/60"
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={{ color: solarOn ? "#F6C90E" : "#475569" }}
            transition={{ duration: 0.3 }}
          >
            <Sun size={13} />
          </motion.div>
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
            Solar Setup
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Power
            size={11}
            className={solarOn ? "text-solar" : "text-slate-500"}
          />
          <Switch
            checked={solarOn}
            onCheckedChange={toggleSolar}
            aria-label="Toggle solar panels"
          />
        </div>
      </div>

      {/* Capacity pills */}
      <div className="flex gap-1 flex-wrap">
        {SOLAR_PRESETS.map((p) => (
          <button
            key={p.kwp}
            onClick={() => setPanelKwp(p.kwp)}
            disabled={!solarOn}
            className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              panelKwp === p.kwp
                ? "border-solar bg-solar/10 text-solar"
                : "border-surface-stroke text-text-muted hover:border-solar/40"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Status line */}
      <div className="mt-1 text-[9px]" style={{ color: solarOn ? "#F6C90E" : "#475569" }}>
        {solarOn
          ? `${panelKwp} kWp active — ~${(panelKwp * 4.5).toFixed(0)} kWh/day clear sky`
          : "Panels disconnected — no generation"}
      </div>
    </div>
  );
}
