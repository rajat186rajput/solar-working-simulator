"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SCENARIOS } from "@/lib/scenarios";
import { useSimStore } from "@/store/simulation-store";

const OUTCOME_ICONS: Record<string, string> = {
  good: "✅",
  bad: "❌",
  warn: "⚠️",
};

// Short labels for pills
const SHORT_LABELS: Record<string, string> = {
  s1: "Bijli Gayi (2PM)",
  s2: "Raat Cut",
  s3: "Baarish+Load",
  s4: "Battery Full",
  s5: "EV+2AC+Geyser",
  s6: "Shaam Cut",
};

export function ScenarioPills() {
  const { activateScenario, mode } = useSimStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [burstId, setBurstId] = useState<string | null>(null);

  const handleClick = (scenario: (typeof SCENARIOS)[number]) => {
    setBurstId(scenario.id);
    setTimeout(() => {
      setBurstId(null);
      activateScenario(scenario);
      setActiveId(scenario.id);
    }, 350);
  };

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
        Scenarios
      </div>
      <div className="flex flex-wrap gap-1">
        {SCENARIOS.map((s) => {
          const outcome = s.modeOutcomes[mode];
          const isActive = activeId === s.id;
          const isBursting = burstId === s.id;
          return (
            <div key={s.id} className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleClick(s)}
                className={`relative px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all select-none overflow-hidden ${
                  isActive
                    ? "border-solar bg-solar/15 text-solar"
                    : "border-surface-stroke bg-surface-card/60 text-text-secondary hover:border-solar/40 hover:text-text-primary"
                }`}
                aria-pressed={isActive}
              >
                <span className="mr-1">{OUTCOME_ICONS[outcome]}</span>
                {SHORT_LABELS[s.id] ?? s.title}
              </motion.button>

              {/* Burst particles */}
              <AnimatePresence>
                {isBursting &&
                  Array.from({ length: 6 }).map((_, i) => {
                    const angle = (i / 6) * 2 * Math.PI;
                    return (
                      <motion.div
                        key={i}
                        className="absolute w-1.5 h-1.5 rounded-full bg-solar pointer-events-none z-50"
                        style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}
                        initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                        animate={{
                          x: Math.cos(angle) * 24,
                          y: Math.sin(angle) * 24,
                          opacity: 0,
                          scale: 0,
                        }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                      />
                    );
                  })}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
