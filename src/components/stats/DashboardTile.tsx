"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import type { ReactNode } from "react";

interface DashboardTileProps {
  label: string;
  value: number;
  unit?: string;
  prefix?: string;
  icon?: string;
  color?: string;
  formatFn?: (v: number) => string;
  textValue?: string;
  textColor?: string;
  /** Optional sub-line: e.g. "Charging 340W" */
  subLine?: string;
  subLineColor?: string;
  /** 0–1 fill bar underneath value */
  fillFraction?: number;
  fillColor?: string;
  /** Optional extra controls/content rendered at the bottom of the tile */
  extra?: ReactNode;
}

export function DashboardTile({
  label,
  value,
  unit,
  prefix,
  icon,
  color,
  formatFn,
  textValue,
  textColor,
  subLine,
  subLineColor,
  fillFraction,
  fillColor,
  extra,
}: DashboardTileProps) {
  const motionVal = useMotionValue(value);
  const rounded = useTransform(motionVal, Math.round);
  const prevRef = useRef(value);

  useEffect(() => {
    prevRef.current = value;
    const controls = animate(motionVal, value, { duration: 0.6, ease: "easeOut" });
    return controls.stop;
  }, [value, motionVal]);

  const displayColor = textColor || color || "#F1F5F9";

  return (
    <div className="flex flex-col px-2.5 py-2 overflow-hidden">
      {/* Label row */}
      <div className="flex items-center gap-1 text-[10px] text-text-muted uppercase tracking-wide leading-none shrink-0">
        {icon && <span className="text-sm leading-none">{icon}</span>}
        <span>{label}</span>
      </div>

      {/* Value */}
      <div className="flex items-center min-h-0 mt-1">
        {textValue ? (
          <span className="text-sm font-bold tabular-nums leading-none" style={{ color: displayColor }}>
            {textValue}
          </span>
        ) : (
          <motion.span
            className="text-xl font-bold tabular-nums leading-none"
            style={{ color: displayColor }}
          >
            {formatFn ? (
              formatFn(value)
            ) : (
              <>
                {prefix}
                <motion.span>{rounded}</motion.span>
                {unit && <span className="text-xs ml-0.5 font-normal opacity-70">{unit}</span>}
              </>
            )}
          </motion.span>
        )}
      </div>

      {/* Fill bar */}
      {fillFraction !== undefined && (
        <div className="shrink-0 h-1.5 bg-surface-dark rounded-full overflow-hidden w-full mt-1">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: fillColor || displayColor }}
            animate={{ width: `${Math.max(0, Math.min(1, fillFraction)) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      )}

      {/* Sub-line */}
      {subLine && (
        <div
          className="shrink-0 text-[10px] leading-none mt-0.5 truncate"
          style={{ color: subLineColor || "#475569" }}
        >
          {subLine}
        </div>
      )}

      {/* Extra controls slot */}
      {extra && (
        <div className="mt-1.5 shrink-0">
          {extra}
        </div>
      )}
    </div>
  );
}
