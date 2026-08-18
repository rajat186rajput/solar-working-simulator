"use client";

import { motion } from "framer-motion";
import type { FlowType } from "@/lib/types";

const FLOW_COLORS: Record<FlowType, string> = {
  solar: "#F6C90E",
  "battery-charge": "#22C55E",
  "battery-discharge": "#F97316",
  "grid-import": "#3B82F6",
  "grid-export": "#A855F7",
  load: "#F8FAFC",
};

// Maps each flow type to the SVG filter id defined in SchematicSVG defs
const GLOW_FILTER: Record<FlowType, string> = {
  solar:              "url(#glow-yellow)",
  "grid-import":      "url(#glow-blue)",
  "grid-export":      "url(#glow-purple)",
  "battery-charge":   "url(#glow-green)",
  "battery-discharge":"url(#glow-orange)",
  load:               "url(#glow-white)",
};

interface PowerFlowLineProps {
  pathD: string;
  powerW: number;
  flowType: FlowType;
  isActive: boolean;
  gridFail?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function PowerFlowLine({ pathD, powerW, flowType, isActive, gridFail }: PowerFlowLineProps) {
  const strokeWidth = 2.5;
  const color = gridFail && (flowType === "grid-import" || flowType === "grid-export")
    ? "#EF4444"
    : FLOW_COLORS[flowType];

  const glowFilter = isActive && !gridFail ? GLOW_FILTER[flowType] : undefined;

  return (
    <motion.path
      d={pathD}
      fill="none"
      stroke={color}
      initial={{ strokeWidth: 1, opacity: 0.15 }}
      animate={{
        strokeWidth: isActive ? strokeWidth : 1,
        opacity: isActive ? 1 : 0.15,
        stroke: color,
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      strokeLinecap="round"
      strokeDasharray={isActive ? "none" : "4 8"}
      filter={glowFilter}
      aria-hidden="true"
      className="power-flow-path"
      // GATE-2 round-3 overlap-check (path-vs-text) — lets the script match a
      // sample point on THIS path back to its own flow-watt-label pill (same
      // data-flow-type on the label <g>), so the path crossing its own label
      // is never flagged as a violation, only crossing anything else is.
      data-flow-type={flowType}
      // Both directions of a bidirectional pair (grid import/export,
      // battery charge/discharge) are ALWAYS in the DOM (just dashed +
      // barely-visible at 0.15 opacity when inactive) — the overlap-check
      // script only samples ACTIVE (solid, visible) paths, since an
      // inactive dashed line crossing text is not a real visual defect.
      data-flow-active={isActive ? "true" : "false"}
    />
  );
}
