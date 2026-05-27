"use client";

import { ZapOff } from "lucide-react";
import { useSimStore } from "@/store/simulation-store";
import { getDaySparkline } from "@/lib/solar-curve";
import {
  LineChart, Line, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";

export function ControlsPanel() {
  const { dayType, panelKwp, mode } = useSimStore();

  const showGrid  = mode !== "off-grid";
  const sparkData = getDaySparkline(dayType, panelKwp);

  return (
    <div className="flex flex-col h-full gap-1.5 overflow-y-auto pr-0.5">
      {/* === SOLAR SPARKLINE === */}
      <div className="rounded-xl border border-surface-stroke bg-surface-card/60 p-2 space-y-1 flex-shrink-0">
        <div className="text-[9px] text-text-muted uppercase tracking-wide font-semibold mb-1">
          Solar curve — today
        </div>
        <div style={{ minWidth: 0, minHeight: 32, width: "100%", height: 48 }}>
          <ResponsiveContainer width="100%" height={48}>
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="watts"
                stroke="#F6C90E"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 8, fill: "#475569" }}
                tickLine={false}
                axisLine={false}
                interval={3}
              />
              <RechartsTooltip
                contentStyle={{
                  background: "#1E293B",
                  border: "1px solid #334155",
                  borderRadius: 6,
                  fontSize: 10,
                  color: "#F1F5F9",
                }}
                formatter={(val) => [`${Math.round(Number(val ?? 0))} W`, "Solar"]}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Off-grid note (when no grid section visible) */}
      {!showGrid && (
        <div className="rounded-xl border border-surface-stroke bg-surface-card/60 p-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-text-muted text-[10px]">
            <ZapOff size={12} />
            <span>Off-Grid — no grid connection</span>
          </div>
        </div>
      )}
    </div>
  );
}
