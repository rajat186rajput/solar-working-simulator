"use client";

import type { FlowType } from "@/lib/types";

const FLOW_COLORS: Record<FlowType, string> = {
  solar: "#F6C90E",
  "battery-charge": "#22C55E",
  "battery-discharge": "#F97316",
  "grid-import": "#3B82F6",
  "grid-export": "#A855F7",
  load: "#F8FAFC",
};

// Base particle count — scales up with power
const BASE_PARTICLES = 5;
const MAX_PARTICLES  = 10;

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

  // Duration: higher power = faster
  const durationMs = Math.max(500, (3 - (safePowerW / 3000) * 2) * 1000);

  // Particle count scales with power (5–10)
  const particleCount = Math.round(
    BASE_PARTICLES + Math.min(1, safePowerW / 3000) * (MAX_PARTICLES - BASE_PARTICLES)
  );

  // Arrow geometry — fixed size
  const arrowW = 8;
  const arrowH = 8;

  // Trail particles: 2 trailing ghost copies per main particle at slight opacity
  const TRAIL_OFFSETS = [-0.04, -0.08]; // fraction of duration behind

  return (
    <>
      {/* Main particles */}
      {Array.from({ length: particleCount }).map((_, i) => (
        <path
          key={`main-${i}`}
          d={`M ${arrowW} 0 L 0 ${-arrowH} L 0 ${arrowH} Z`}
          fill={color}
          opacity={0.92}
          style={{
            offsetPath: `path("${pathD}")`,
            offsetDistance: "0%",
            offsetRotate: "auto",
            animationName: "flowParticle",
            animationDuration: `${durationMs}ms`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            animationDelay: `${(i / particleCount) * durationMs}ms`,
          } as React.CSSProperties}
        />
      ))}

      {/* Trailing glow particles — smaller, more transparent */}
      {Array.from({ length: particleCount }).map((_, i) =>
        TRAIL_OFFSETS.map((offsetFraction, ti) => (
          <path
            key={`trail-${i}-${ti}`}
            d={`M ${arrowW * 0.7} 0 L 0 ${-arrowH * 0.7} L 0 ${arrowH * 0.7} Z`}
            fill={color}
            opacity={0.25 - ti * 0.1}
            style={{
              offsetPath: `path("${pathD}")`,
              offsetDistance: "0%",
              offsetRotate: "auto",
              animationName: "flowParticle",
              animationDuration: `${durationMs}ms`,
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
              animationDelay: `${(i / particleCount) * durationMs + offsetFraction * durationMs}ms`,
            } as React.CSSProperties}
          />
        ))
      )}
    </>
  );
}
