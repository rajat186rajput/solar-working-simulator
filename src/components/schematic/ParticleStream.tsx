"use client";

import type { FlowType } from "@/lib/types";
import { clamp } from "@/lib/utils";

const FLOW_COLORS: Record<FlowType, string> = {
  solar: "#F6C90E",
  "battery-charge": "#22C55E",
  "battery-discharge": "#F97316",
  "grid-import": "#3B82F6",
  "grid-export": "#A855F7",
  load: "#F8FAFC",
};

const PARTICLE_COUNT = 6;

interface ParticleStreamProps {
  pathD: string;
  powerW?: number;
  flowType: FlowType;
  isActive: boolean;
}

export function ParticleStream({ pathD, powerW = 0, flowType, isActive }: ParticleStreamProps) {
  if (!isActive) return null;

  const safePowerW = Number.isFinite(powerW) ? powerW : 0;
  const color = FLOW_COLORS[flowType];
  // FIX 6: duration proportional to watts — higher load = faster animation
  const durationMs = Math.max(500, (3 - (safePowerW / 3000) * 2) * 1000);
  const radius = clamp(2 + safePowerW / 3000, 2, 4);
  const safeRadius = Number.isFinite(radius) ? radius : 2;

  // Arrow size scales with particle radius: wider = more prominent
  const arrowW = safeRadius * 2.5;   // tip-to-base length (forward direction)
  const arrowH = safeRadius * 1.8;   // half-height of base

  return (
    <>
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        // Filled triangle pointing right (+x). CSS offset-rotate:auto rotates it
        // to match the path tangent direction at each offset-distance position.
        // Triangle: tip at (arrowW, 0), base corners at (0, ±arrowH).
        <path
          key={i}
          d={`M ${arrowW} 0 L 0 ${-arrowH} L 0 ${arrowH} Z`}
          fill={color}
          opacity={isActive ? 0.9 : 0}
          style={{
            offsetPath: `path("${pathD}")`,
            offsetDistance: "0%",
            offsetRotate: "auto",
            animationName: isActive ? "flowParticle" : "none",
            animationDuration: `${durationMs}ms`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            animationDelay: `${(i / PARTICLE_COUNT) * durationMs}ms`,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}
