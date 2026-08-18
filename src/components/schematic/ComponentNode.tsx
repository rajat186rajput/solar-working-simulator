"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sun, Zap, BatteryCharging, Plug, Gauge, House } from "lucide-react";
import type { ReactNode } from "react";

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
  tooltip?: string;
  /** Optional controls rendered inside the node via foreignObject */
  controls?: ReactNode;
  /** Extra height to add when controls are present (default 0) */
  controlsHeight?: number;
  /** Whether this node is currently charging (for shimmer animation) */
  isCharging?: boolean;
  /** Small pill badge top-right of the node (Real Setup — module count / PCU-mode initials) */
  badge?: string;
  /** Real Setup overload escalation (Section F.3 / G.3) — House node only. */
  overloadLevel?: "none" | "amber" | "red" | "tripped";
}

const NODE_W = 150;
const NODE_H_BASE = 70;

export function ComponentNode({
  cx, cy, label, subvalue, iconType, glowColor, isActive, danger, socPercent,
  controls, controlsHeight = 0, isCharging = false, badge, overloadLevel = "none",
}: ComponentNodeProps) {
  const Icon = ICON_MAP[iconType];
  const reduceMotion = useReducedMotion();

  const NODE_H = NODE_H_BASE + (controls ? controlsHeight : 0);

  const x = cx - NODE_W / 2;
  const y = cy - NODE_H / 2;

  const overloadColor = overloadLevel === "amber" ? "#FB923C" : overloadLevel === "red" || overloadLevel === "tripped" ? "#EF4444" : null;
  const borderColor = overloadColor ?? (danger ? "#EF4444" : isActive ? glowColor : "#334155");
  const borderWidth  = overloadLevel !== "none" ? 2 : isActive ? 1.5 : 1;
  // Tripped = a stopped state should not look alive — desaturate, no pulse.
  const nodeOpacity = overloadLevel === "tripped" ? 0.4 : 1;

  // Derive a glow shadow intensity based on activity
  const glowIntensity = isActive ? (danger ? "#EF444488" : `${glowColor}55`) : "none";

  // SoC bar gradient id — unique per node position to avoid collisions
  const gradId = `soc-grad-${cx}-${cy}`;
  const shimId = `soc-shim-${cx}-${cy}`;

  // socColor retained for potential future use (e.g. text labels)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _socColor = socPercent !== undefined
    ? socPercent >= 0.8 ? "#22C55E"
      : socPercent >= 0.4 ? "#EAB308"
      : socPercent >= 0.2 ? "#F97316"
      : "#EF4444"
    : "#22C55E";

  return (
    <g style={{ cursor: "default", opacity: nodeOpacity }}>

      {/* ── Glow pulse ring — normal active state (suppressed during overload escalation) ── */}
      {isActive && overloadLevel === "none" && (
        <motion.circle
          cx={cx} cy={cy} r={50}
          fill={glowColor}
          fillOpacity={0}
          initial={{ r: 50, fillOpacity: 0 }}
          animate={{
            fillOpacity: [0, 0.12, 0],
            r: [40, 55, 40],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* ── Overload escalation ring (Section F.3 / G.3) ──
          amber: 100–120% cap, period 2s. red: 120–150% cap, period 0.8s (faster).
          tripped: solid, no pulse — a stopped state should not look alive.
          Reduced motion: static colored border only (color is never the only
          channel — the STATUS/badge text always carries the same message). */}
      {overloadLevel === "amber" && (
        reduceMotion ? (
          <circle cx={cx} cy={cy} r={48} fill="none" stroke="#FB923C" strokeWidth={2.5} opacity={0.7} />
        ) : (
          <motion.circle
            cx={cx} cy={cy} r={48} fill="none" stroke="#FB923C" strokeWidth={2.5}
            initial={{ opacity: 0.15 }}
            animate={{ opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )
      )}
      {overloadLevel === "red" && (
        reduceMotion ? (
          <circle cx={cx} cy={cy} r={48} fill="none" stroke="#EF4444" strokeWidth={3} opacity={0.85} />
        ) : (
          <motion.circle
            cx={cx} cy={cy} r={48} fill="none" stroke="#EF4444" strokeWidth={3}
            initial={{ opacity: 0.15 }}
            animate={{ opacity: [0.15, 0.5, 0.15] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
          />
        )
      )}
      {overloadLevel === "tripped" && (
        <circle cx={cx} cy={cy} r={48} fill="none" stroke="#EF4444" strokeWidth={3} opacity={0.9} />
      )}

      {/* ── SVG defs for SoC gradient + shimmer (battery only) ── */}
      {socPercent !== undefined && (
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={socPercent >= 0.8 ? "#22C55E" : socPercent >= 0.4 ? "#EAB308" : "#EF4444"} />
            <stop offset="50%"  stopColor={socPercent >= 0.8 ? "#4ADE80" : socPercent >= 0.4 ? "#FACC15" : "#F97316"} />
            <stop offset="100%" stopColor={socPercent >= 0.8 ? "#22C55E" : socPercent >= 0.4 ? "#EAB308" : "#EF4444"} />
          </linearGradient>
          {isCharging && (
            <linearGradient id={shimId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="white" stopOpacity="0" />
              <stop offset="40%"  stopColor="white" stopOpacity="0.35" />
              <stop offset="60%"  stopColor="white" stopOpacity="0.35" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          )}
        </defs>
      )}

      {/* ── Card background — glassmorphism ──
          data-node-card: GATE-1 overlap-check script (scripts/overlap-check.mjs)
          selector for "this is a node's own boundary" — flow labels must
          never intersect any of these. */}
      <rect
        data-node-card="true"
        x={x} y={y}
        width={NODE_W} height={NODE_H}
        rx={12}
        fill="rgba(15, 23, 42, 0.60)"
        stroke={borderColor}
        strokeWidth={borderWidth}
        style={{
          filter: isActive ? `drop-shadow(0 0 8px ${glowIntensity})` : "none",
        }}
      />

      {/* ── Badge (Real Setup — module count / PCU-mode initials) ──
          GATE-1 (Rajat: badge overlaps the card's top-right corner): this
          used to straddle the top border (y-8, half above / half below the
          card edge). Moved fully inside the card with 4px clearance from
          both the top and right borders — sits in the header strip, clear
          of the icon (top-left) and the label text (starts at x+36). */}
      {badge && (
        <g>
          <rect
            x={x + NODE_W - 38} y={y + 4}
            width={34} height={15} rx={7.5}
            fill="rgba(15,23,42,0.92)"
            stroke={isActive ? glowColor : "#334155"}
            strokeWidth={1}
          />
          <text
            x={x + NODE_W - 21} y={y + 11.5}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={isActive ? glowColor : "#94A3B8"}
            fontSize="8.5"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="700"
          >
            {badge}
          </text>
        </g>
      )}

      {/* ── Subtle inner glass sheen (top strip) ── */}
      <rect
        x={x + 1} y={y + 1}
        width={NODE_W - 2} height={14}
        rx={11}
        fill="rgba(255,255,255,0.04)"
      />

      {/* ── Icon ── */}
      <foreignObject x={x + 8} y={y + 8} width={24} height={24}>
        <div className="flex items-center justify-center w-6 h-6">
          <Icon
            size={18}
            color={isActive ? glowColor : "#475569"}
          />
        </div>
      </foreignObject>

      {/* ── Label ── */}
      <text
        x={x + 36} y={y + 22}
        fill={isActive ? "#F1F5F9" : "#64748B"}
        fontSize="10"
        fontFamily="Inter, sans-serif"
        fontWeight="500"
      >
        {label}
      </text>

      {/* ── Sub-value ── */}
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

      {/* ── SoC bar (battery only) with gradient fill + shimmer ── */}
      {socPercent !== undefined && (
        <>
          {/* Track */}
          <rect x={x + 8} y={y + 56} width={NODE_W - 16} height={6} rx={3} fill="rgba(15,23,42,0.8)" />
          {/* Gradient fill bar */}
          <motion.rect
            x={x + 8} y={y + 56}
            width={0} height={6} rx={3}
            fill={`url(#${gradId})`}
            initial={{ width: 0 }}
            animate={{ width: Number.isFinite(socPercent) ? socPercent * (NODE_W - 16) : 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          {/* Shimmer overlay when charging */}
          {isCharging && Number.isFinite(socPercent) && socPercent > 0 && (
            <motion.rect
              x={x + 8} y={y + 56}
              width={socPercent * (NODE_W - 16)} height={6} rx={3}
              fill={`url(#${shimId})`}
              animate={{ x: [x + 8 - 40, x + 8 + (NODE_W - 16)] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
            />
          )}
        </>
      )}

      {/* ── Embedded controls via foreignObject ──
          data-node-foreignobject: GATE-1 overlap-check script reads this
          div's scrollHeight vs clientHeight to catch content that overflows
          its allotted card space (the exact class of bug that produced the
          "text overflows below the card" feedback). */}
      {controls && controlsHeight > 0 && (
        <foreignObject
          x={x + 6}
          y={y + NODE_H_BASE + 2}
          width={NODE_W - 12}
          height={controlsHeight - 6}
        >
          <div
            data-node-foreignobject="true"
            className="w-full h-full"
            style={{ fontFamily: "Inter, sans-serif", overflow: "hidden" }}
            onMouseEnter={(e) => e.stopPropagation()}
            onMouseLeave={(e) => e.stopPropagation()}
          >
            {controls}
          </div>
        </foreignObject>
      )}

      {/* ── Active node border color accent line (top) ── */}
      {isActive && (
        <rect
          x={x + 12} y={y}
          width={NODE_W - 24} height={2}
          rx={1}
          fill={danger ? "#EF4444" : glowColor}
          opacity={0.8}
        />
      )}

    </g>
  );
}
