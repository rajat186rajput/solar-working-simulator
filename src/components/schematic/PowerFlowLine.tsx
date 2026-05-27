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
      aria-hidden="true"
      className="power-flow-path"
    />
  );
}
