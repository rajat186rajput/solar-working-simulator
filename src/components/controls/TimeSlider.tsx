"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { useSimStore } from "@/store/simulation-store";
import type { DayType } from "@/lib/types";
import { getDaySparkline } from "@/lib/solar-curve";
import { formatTime } from "@/lib/utils";
import {
  LineChart, Line, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";

const DAY_TYPES: { value: DayType; label: string; icon: string }[] = [
  { value: "clear", label: "Clear Day", icon: "☀️" },
  { value: "cloudy", label: "Cloudy Day", icon: "⛅" },
  { value: "monsoon", label: "Monsoon", icon: "🌧️" },
];

const TIME_GRADIENTS: Record<number, string[]> = {
  5:  ["#1a0a2e", "#3d1f6b", "#a0522d"],
  7:  ["#f97316", "#fb923c", "#fbbf24"],
  10: ["#fbbf24", "#fde68a", "#ffffff"],
  12: ["#e0f2fe", "#ffffff", "#fef9c3"],
  15: ["#fde68a", "#fb923c", "#f97316"],
  18: ["#f97316", "#dc2626", "#7c3aed"],
  20: ["#1e1b4b", "#0f172a", "#020617"],
};

function getGradientForHour(hour: number): string[] {
  const hours = Object.keys(TIME_GRADIENTS).map(Number).sort((a, b) => a - b);
  let prev = hours[0];
  for (const h of hours) {
    if (hour <= h) break;
    prev = h;
  }
  return TIME_GRADIENTS[prev] || TIME_GRADIENTS[20];
}

export function TimeSlider() {
  const { timeHour, dayType, panelKwp, setTimeHour, setDayType } = useSimStore();
  const sliderRef = useRef<HTMLDivElement>(null);

  const sparkData = getDaySparkline(dayType, panelKwp);
  const gradColors = getGradientForHour(timeHour);
  const isNight = timeHour < 5 || timeHour >= 19;

  const sunProgress = Math.max(0, Math.min(1, (timeHour - 5) / (19 - 5)));
  const sunOpacity = timeHour >= 5 && timeHour < 19 ? 1 : 0;
  const moonOpacity = isNight ? 1 : 0;

  return (
    <div className="space-y-3">
      {/* Solar sparkline */}
      <div className="h-16 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparkData}>
            <Line
              type="monotone"
              dataKey="watts"
              stroke="#F6C90E"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={true}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "#475569" }}
              tickLine={false}
              axisLine={false}
              interval={2}
            />
            <RechartsTooltip
              contentStyle={{
                background: "#1E293B",
                border: "1px solid #334155",
                borderRadius: 8,
                fontSize: 11,
                color: "#F1F5F9",
              }}
              formatter={(val) => [`${Math.round(Number(val ?? 0))} W`, "Solar"]}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Time display + sky gradient */}
      <div className="relative">
        <motion.div
          animate={{
            background: `linear-gradient(to right, ${gradColors.join(", ")})`,
          }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="h-10 rounded-full w-full flex items-center justify-center"
        >
          <span className="text-sm font-bold text-white drop-shadow-md">
            {formatTime(timeHour)}
            {isNight && <span className="ml-1 text-xs">— Night Mode</span>}
          </span>
        </motion.div>
        {/* Sun/Moon arc indicator */}
        <div className="absolute -top-5 w-full flex items-center px-2">
          <motion.span
            style={{ position: "absolute", left: `${sunProgress * 90}%` }}
            animate={{ opacity: sunOpacity }}
            transition={{ duration: 0.5 }}
            className="text-lg"
          >
            ☀️
          </motion.span>
          <motion.span
            style={{ position: "absolute", right: "4%" }}
            animate={{ opacity: moonOpacity }}
            transition={{ duration: 0.5 }}
            className="text-lg"
          >
            🌙
          </motion.span>
        </div>
      </div>

      {/* Slider */}
      <div ref={sliderRef}>
        <Slider
          min={5}
          max={23}
          step={1}
          value={[timeHour]}
          onValueChange={(vals) => { const v = Array.isArray(vals) ? vals[0] : vals; setTimeHour(v as number); }}
          aria-label="Time of day"
          aria-valuetext={`${formatTime(timeHour)}`}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-text-muted mt-1">
          <span>5 AM</span>
          <span>12 PM</span>
          <span>11 PM</span>
        </div>
      </div>

      {/* Day type selector */}
      <div className="flex gap-2">
        {DAY_TYPES.map((dt) => (
          <button
            key={dt.value}
            onClick={() => setDayType(dt.value)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
              dayType === dt.value
                ? "border-solar bg-solar/10 text-solar"
                : "border-surface-stroke text-text-muted hover:border-surface-stroke/80"
            }`}
          >
            <span className="mr-1">{dt.icon}</span>
            {dt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
