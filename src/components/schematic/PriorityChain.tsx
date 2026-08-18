"use client";

// PriorityChain — tiny priority-chain visual under each PCU-mode chip.
// 03_REAL_SETUP_DESIGN.md Section C (adapted verbatim from the design spec's
// snippet, brand flow-color tokens from 02_DESIGN.md §1.1).

import { Sun, BatteryCharging, Zap, ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { FlowNode } from "@/lib/realSetup";

const NODE_ICON = { solar: Sun, battery: BatteryCharging, grid: Zap };
const NODE_COLOR: Record<FlowNode, string> = {
  solar: "#F6C90E",
  battery: "#22C55E",
  grid: "#3B82F6",
};

export function PriorityChain({
  chain,
  label,
  ariaLabel,
}: {
  chain: FlowNode[];
  label?: string;
  /** R7-R9 (code review): full descriptive copy (i18n LABELS *Sub/Day/Night/Load/Charge
   * keys) — shown as a title tooltip + exposed to assistive tech via sr-only text,
   * since the visible `label` above is deliberately kept short for the 2×2 chip grid. */
  ariaLabel?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex items-center gap-1" title={ariaLabel}>
      {label && <span className="text-[9px] text-text-muted w-9 shrink-0">{label}</span>}
      {chain.map((node, i) => {
        const Icon = NODE_ICON[node];
        return (
          <motion.span
            key={i}
            className="flex items-center gap-1"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={reduceMotion ? { duration: 0.15 } : { delay: i * 0.06, duration: 0.2 }}
          >
            <Icon size={12} color={NODE_COLOR[node]} />
            {i < chain.length - 1 && <ArrowRight size={10} className="text-text-muted" />}
          </motion.span>
        );
      })}
      {ariaLabel && <span className="sr-only">{ariaLabel}</span>}
    </div>
  );
}
