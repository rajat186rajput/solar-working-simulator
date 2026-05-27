// NOTE: ScenarioCard is currently unused — Scenarios section was removed from ControlsPanel in v12
// per Rajat's instruction. Component retained for future use. Not rendered anywhere.
// a11y: if re-enabled, replace <motion.div onClick> with <motion.button type="button"> for keyboard accessibility.
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ScenarioPreset } from "@/lib/types";
import { useSimStore } from "@/store/simulation-store";

const OUTCOME_ICONS: Record<string, string> = {
  good: "✅",
  bad: "❌",
  warn: "⚠️",
};

const MODE_LABELS: Record<string, string> = {
  "on-grid": "OG",
  "off-grid": "OF",
  hybrid: "HY",
};

interface ScenarioCardProps {
  scenario: ScenarioPreset;
}

export function ScenarioCard({ scenario }: ScenarioCardProps) {
  const { activateScenario } = useSimStore();
  const [explosionActive, setExplosionActive] = useState(false);

  const handleClick = () => {
    setExplosionActive(true);
    setTimeout(() => {
      setExplosionActive(false);
      activateScenario(scenario);
    }, 400);
  };

  const explosionParticles = Array.from({ length: 8 });

  return (
    <div className="relative">
      <motion.div
        whileHover={{ scale: 1.02, boxShadow: "0 12px 32px rgba(246,201,14,0.12)" }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={handleClick}
        className="rounded-xl border border-surface-stroke bg-surface-card p-3 cursor-pointer relative overflow-hidden"
      >
        <div className="text-xs font-semibold text-text-primary mb-1 leading-tight">
          {scenario.title}
        </div>
        <div className="text-[10px] text-text-muted mb-2 leading-tight">
          {scenario.description}
        </div>
        <div className="flex gap-2">
          {(["on-grid", "off-grid", "hybrid"] as const).map((m) => (
            <div key={m} className="flex items-center gap-0.5 text-[10px] text-text-muted">
              <span>{MODE_LABELS[m]}</span>
              <span>{OUTCOME_ICONS[scenario.modeOutcomes[m]]}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Explosion particles */}
      <AnimatePresence>
        {explosionActive && explosionParticles.map((_, i) => {
          const angle = (i / 8) * 2 * Math.PI;
          return (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-solar pointer-events-none z-50"
              style={{ left: "50%", top: "50%" }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos(angle) * 40,
                y: Math.sin(angle) * 40,
                opacity: 0,
                scale: 0,
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
