"use client";

// F.1 — rotating "Family Rules" ticker (Section F.1 / G.7). Full-width strip,
// pinned directly below TopBar row 2, rendered only when Real Setup is active.
//
// GATE-1 (Rajat feedback): the solar-node curtailment message used to be
// crammed into the node card and wrapped onto 2 lines, touching the border.
// It's now a compact pill on the node (see SchematicSVG's SolarNodeControls)
// with the full "why" text carried here instead, appended to the rotation
// whenever there's something to curtail.

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { useSimStore } from "@/store/simulation-store";
import { L, type LabelKey } from "@/lib/i18n";

const RULE_TIPS: LabelKey[] = ["ruleGeyser", "ruleEV", "rule2AC"];

export function RealSetupTicker() {
  const simView = useSimStore((s) => s.simView);
  const lang = useSimStore((s) => s.lang);
  const curtailedW = useSimStore((s) => s.curtailedW);
  const netMeterInstalled = useSimStore((s) => s.netMeterInstalled);
  const reduceMotion = useReducedMotion();
  const [idx, setIdx] = useState(0);

  const tips: string[] = [
    ...RULE_TIPS.map((k) => L(lang, k)),
    ...(curtailedW > 1 && !netMeterInstalled
      ? [`${L(lang, "curtailedChip")}: ${(curtailedW / 1000).toFixed(2)} kW — ${L(lang, "curtailedHint")}`]
      : []),
  ];

  useEffect(() => {
    if (simView !== "real-setup") return;
    const interval = setInterval(() => setIdx((i) => (i + 1) % tips.length), 6000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simView, tips.length]);

  if (simView !== "real-setup") return null;

  const safeIdx = tips.length > 0 ? idx % tips.length : 0;

  return (
    <div className="flex items-center gap-2 px-3 sm:px-4 h-8 shrink-0 border-b border-surface-stroke/40 bg-surface-card/60 overflow-hidden">
      <Lightbulb size={12} className="text-solar shrink-0" />
      <div className="flex-1 min-w-0 relative h-4">
        <AnimatePresence mode={reduceMotion ? "sync" : "wait"}>
          <motion.span
            key={safeIdx}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.4, ease: "easeInOut" }}
            className="absolute inset-0 text-[11px] text-text-secondary truncate block"
          >
            {tips[safeIdx]}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="flex items-center gap-0.5 shrink-0" aria-hidden="true">
        {tips.map((_, i) => (
          <span
            key={i}
            className={`inline-block w-1 h-1 rounded-full transition-colors ${
              i === safeIdx ? "bg-solar" : "bg-surface-stroke"
            }`}
          />
        ))}
      </span>
    </div>
  );
}
