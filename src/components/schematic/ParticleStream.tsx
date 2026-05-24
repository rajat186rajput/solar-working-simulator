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
  powerW: number;
  flowType: FlowType;
  isActive: boolean;
}

export function ParticleStream({ pathD, powerW, flowType, isActive }: ParticleStreamProps) {
  if (!isActive) return null;

  const color = FLOW_COLORS[flowType];
  const durationMs = Math.max(400, 2400 - (powerW / 3000) * 2000);
  const radius = clamp(2 + powerW / 3000, 2, 4);

  return (
    <>
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <circle
          key={i}
          r={radius}
          fill={color}
          opacity={isActive ? 0.9 : 0}
          style={{
            offsetPath: `path("${pathD}")`,
            offsetDistance: "0%",
            animation: isActive
              ? `flowParticle ${durationMs}ms linear infinite`
              : "none",
            animationDelay: `${(i / PARTICLE_COUNT) * durationMs}ms`,
          }}
        />
      ))}
    </>
  );
}
