"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Zap, BatteryCharging, Plug, Gauge, House } from "lucide-react";

const ICON_MAP = {
  sun: Sun,
  zap: Zap,
  battery: BatteryCharging,
  plug: Plug,
  gauge: Gauge,
  house: House,
};

interface ComponentNodeProps {
  cx: number;
  cy: number;
  label: string;
  subvalue: string;
  iconType: keyof typeof ICON_MAP;
  glowColor: string;
  isActive: boolean;
  danger?: boolean;
  socPercent?: number;
  tooltip: string;
}

const NODE_W = 130;
const NODE_H = 70;

export function ComponentNode({
  cx, cy, label, subvalue, iconType, glowColor, isActive, danger, socPercent, tooltip,
}: ComponentNodeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const Icon = ICON_MAP[iconType];

  const x = cx - NODE_W / 2;
  const y = cy - NODE_H / 2;

  const borderColor = danger ? "#EF4444" : isActive ? glowColor : "#334155";
  const bgOpacity = isActive ? 1 : 0.5;

  return (
    <g
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{ cursor: "pointer" }}
    >
      {/* Glow pulse ring */}
      {isActive && (
        <motion.circle
          cx={cx} cy={cy} r={50}
          fill={glowColor}
          fillOpacity={0}
          animate={{
            fillOpacity: [0, 0.12, 0],
            r: [40, 55, 40],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Card background */}
      <rect
        x={x} y={y}
        width={NODE_W} height={NODE_H}
        rx={12}
        fill={`rgba(30, 41, 59, ${bgOpacity})`}
        stroke={borderColor}
        strokeWidth={1.5}
        style={{
          filter: isActive ? `drop-shadow(0 0 8px ${glowColor}40)` : "none",
        }}
      />

      {/* Icon */}
      <foreignObject x={x + 8} y={y + 8} width={24} height={24}>
        <div className="flex items-center justify-center w-6 h-6">
          <Icon
            size={18}
            color={isActive ? glowColor : "#475569"}
          />
        </div>
      </foreignObject>

      {/* Label */}
      <text
        x={x + 36} y={y + 22}
        fill={isActive ? "#F1F5F9" : "#64748B"}
        fontSize="10"
        fontFamily="Inter, sans-serif"
        fontWeight="500"
      >
        {label}
      </text>

      {/* Sub-value */}
      <text
        x={cx} y={y + 50}
        textAnchor="middle"
        fill={danger ? "#EF4444" : isActive ? glowColor : "#475569"}
        fontSize="14"
        fontFamily="Inter, sans-serif"
        fontWeight="700"
      >
        {subvalue}
      </text>

      {/* SoC bar (battery only) */}
      {socPercent !== undefined && (
        <>
          <rect x={x + 8} y={y + 56} width={114} height={6} rx={3} fill="#1E293B" />
          <motion.rect
            x={x + 8} y={y + 56}
            width={0} height={6} rx={3}
            fill={
              socPercent >= 0.8 ? "#22C55E"
              : socPercent >= 0.4 ? "#EAB308"
              : socPercent >= 0.2 ? "#F97316"
              : "#EF4444"
            }
            animate={{ width: socPercent * 114 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </>
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.g
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.2 }}
          >
            <rect
              x={cx > 500 ? cx - 240 : cx + 15}
              y={cy - 50}
              width={220}
              height={85}
              rx={8}
              fill="#1E293B"
              stroke="#334155"
              strokeWidth={1}
              style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}
            />
            <foreignObject
              x={cx > 500 ? cx - 235 : cx + 20}
              y={cy - 45}
              width={210}
              height={75}
            >
              <div className="text-[11px] text-text-secondary leading-relaxed p-1 font-['Inter']">
                {tooltip}
              </div>
            </foreignObject>
          </motion.g>
        )}
      </AnimatePresence>
    </g>
  );
}
