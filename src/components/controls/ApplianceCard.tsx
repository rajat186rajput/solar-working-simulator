"use client";

import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import type { ApplianceData } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/appliances";
import {
  Wind, Lightbulb, Refrigerator, Tv, Droplets,
  Flame, WashingMachine, Microwave, Shirt, Blender, Car, Zap,
} from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  ac:       <Wind size={20} />,
  fan:      <Wind size={20} />,
  light:    <Lightbulb size={20} />,
  fridge:   <Refrigerator size={20} />,
  tv:       <Tv size={20} />,
  pump:     <Droplets size={20} />,
  geyser:   <Flame size={20} />,
  washing:  <WashingMachine size={20} />,
  microwave:<Microwave size={20} />,
  iron:     <Shirt size={20} />,
  mixer:    <Blender size={20} />,
  ev:       <Car size={20} />,
};

interface ApplianceCardProps {
  appliance: ApplianceData;
  isOn: boolean;
  onToggle: () => void;
}

export function ApplianceCard({ appliance, isOn, onToggle }: ApplianceCardProps) {
  const catColor = CATEGORY_COLORS[appliance.category] || "#94A3B8";

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: `0 8px 24px ${catColor}20` }}
      whileTap={{ scale: 0.97 }}
      animate={{
        backgroundColor: isOn ? "rgba(30,41,59,1)" : "rgba(15,23,42,0.6)",
        borderColor: isOn ? catColor : "#334155",
        boxShadow: isOn ? `0 0 16px ${catColor}20` : "none",
      }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`rounded-xl border p-3 cursor-pointer select-none ${appliance.wide ? "col-span-2" : ""}`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between mb-2">
        <div
          className="p-1.5 rounded-lg"
          style={{
            backgroundColor: isOn ? `${catColor}20` : "rgba(51,65,85,0.4)",
            color: isOn ? catColor : "#475569",
          }}
        >
          {ICON_MAP[appliance.id] ?? <Zap size={20} />}
        </div>
        <Switch
          checked={isOn}
          onCheckedChange={onToggle}
          aria-label={`Toggle ${appliance.name} (${appliance.watts}W)`}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="mt-1">
        <div
          className="text-xs font-medium leading-tight"
          style={{ color: isOn ? "#F1F5F9" : "#64748B" }}
        >
          {appliance.hinglishLabel}
        </div>
        <motion.div
          key={isOn ? "on" : "off"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="text-xs font-bold mt-0.5 tabular-nums"
          style={{ color: isOn ? catColor : "#475569" }}
        >
          {isOn ? `${appliance.watts}W` : "0W"}
          {isOn && appliance.surgeWatts > appliance.watts && (
            <span className="text-[10px] text-text-muted ml-1">
              (surge {appliance.surgeWatts}W)
            </span>
          )}
        </motion.div>
        <div className="text-[10px] text-text-muted mt-0.5">{appliance.typicalHoursPerDay}</div>
      </div>
    </motion.div>
  );
}
