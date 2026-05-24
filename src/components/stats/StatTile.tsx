"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface StatTileProps {
  label: string;
  value: number;
  unit?: string;
  prefix?: string;
  icon?: string;
  color?: string;
  formatFn?: (v: number) => string;
  textValue?: string; // Override with text (e.g. "AVAILABLE")
  textColor?: string;
}

export function StatTile({
  label, value, unit, prefix, icon, color, formatFn, textValue, textColor,
}: StatTileProps) {
  const motionVal = useMotionValue(value);
  const rounded = useTransform(motionVal, Math.round);
  const prevRef = useRef(value);
  const hasBigSwing = Math.abs(value - prevRef.current) > 500;

  useEffect(() => {
    prevRef.current = value;
    const controls = animate(motionVal, value, { duration: 0.6, ease: "easeOut" });
    return controls.stop;
  }, [value, motionVal]);

  const displayColor = textColor || color || "#F1F5F9";

  return (
    <motion.div
      animate={{
        backgroundColor: hasBigSwing
          ? (value > prevRef.current ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)")
          : "transparent",
      }}
      transition={{ duration: 0.3 }}
      className="rounded-lg px-3 py-2 flex flex-col"
    >
      <div className="flex items-center gap-1 text-[10px] text-text-secondary uppercase tracking-wide mb-0.5">
        {icon && <span>{icon}</span>}
        <span>{label}</span>
      </div>
      {textValue ? (
        <span className="text-sm font-bold tabular-nums" style={{ color: displayColor }}>
          {textValue}
        </span>
      ) : (
        <motion.span
          className="text-lg font-bold tabular-nums"
          style={{ color: displayColor }}
        >
          {formatFn
            ? formatFn(value)
            : (
              <>
                {prefix}
                <motion.span>{rounded}</motion.span>
                {unit && <span className="text-xs ml-0.5 font-normal">{unit}</span>}
              </>
            )
          }
        </motion.span>
      )}
    </motion.div>
  );
}
