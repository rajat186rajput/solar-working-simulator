"use client";

// F.1 — rotating "Family Rules" ticker (Section F.1 / G.7). Full-width strip,
// pinned directly below TopBar row 2, rendered only when Real Setup is active.

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { useSimStore } from "@/store/simulation-store";
import { L, type LabelKey } from "@/lib/i18n";

const TIPS: LabelKey[] = ["ruleGeyser", "ruleEV", "rule2AC"];

export function RealSetupTicker() {
  const simView = useSimStore((s) => s.simView);
  const lang = useSimStore((s) => s.lang);
  const reduceMotion = useReducedMotion();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (simView !== "real-setup") return;
    const interval = setInterval(() => setIdx((i) => (i + 1) % TIPS.length), 6000);
    return () => clearInterval(interval);
  }, [simView]);

  if (simView !== "real-setup") return null;

  return (
    <div className="flex items-center gap-2 px-3 sm:px-4 h-8 shrink-0 border-b border-surface-stroke/40 bg-surface-card/60 overflow-hidden">
      <Lightbulb size={12} className="text-solar shrink-0" />
      <div className="flex-1 min-w-0 relative h-4">
        <AnimatePresence mode={reduceMotion ? "sync" : "wait"}>
          <motion.span
            key={idx}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.4, ease: "easeInOut" }}
            className="absolute inset-0 text-[11px] text-text-secondary truncate block"
          >
            {L(lang, TIPS[idx])}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="flex items-center gap-0.5 shrink-0" aria-hidden="true">
        {TIPS.map((_, i) => (
          <span
            key={i}
            className={`inline-block w-1 h-1 rounded-full transition-colors ${
              i === idx ? "bg-solar" : "bg-surface-stroke"
            }`}
          />
        ))}
      </span>
    </div>
  );
}
