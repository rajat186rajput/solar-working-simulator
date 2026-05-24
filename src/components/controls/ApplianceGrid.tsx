"use client";

import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { APPLIANCES, CATEGORY_COLORS } from "@/lib/appliances";
import { useSimStore } from "@/store/simulation-store";
import {
  Wind, Lightbulb, Refrigerator, Tv, Droplets,
  Flame, WashingMachine, Microwave, Shirt, Blender, Car, Zap,
} from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  ac:        <Wind size={14} />,
  fan:       <Wind size={14} />,
  light:     <Lightbulb size={14} />,
  fridge:    <Refrigerator size={14} />,
  tv:        <Tv size={14} />,
  pump:      <Droplets size={14} />,
  geyser:    <Flame size={14} />,
  washing:   <WashingMachine size={14} />,
  microwave: <Microwave size={14} />,
  iron:      <Shirt size={14} />,
  mixer:     <Blender size={14} />,
  ev:        <Car size={14} />,
};

export function ApplianceGrid() {
  const { appliancesOn, toggleAppliance } = useSimStore();

  return (
    <div className="flex flex-col h-full">
      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
        Appliances
      </div>
      {/* 3-column grid, all 12 appliances */}
      <div className="grid grid-cols-3 gap-1 flex-1 content-start">
        {APPLIANCES.map((appliance) => {
          const isOn = appliancesOn.includes(appliance.id);
          const catColor = CATEGORY_COLORS[appliance.category] || "#94A3B8";

          return (
            <motion.div
              key={appliance.id}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              animate={{
                backgroundColor: isOn ? "rgba(30,41,59,1)" : "rgba(15,23,42,0.5)",
                borderColor: isOn ? catColor : "#334155",
              }}
              transition={{ duration: 0.2 }}
              onClick={() => toggleAppliance(appliance.id)}
              className="rounded-lg border p-1.5 cursor-pointer select-none flex flex-col gap-1"
              role="checkbox"
              aria-checked={isOn}
              aria-label={`Toggle ${appliance.name} (${appliance.watts}W)`}
            >
              {/* Icon + switch row */}
              <div className="flex items-center justify-between">
                <div
                  className="p-1 rounded"
                  style={{
                    backgroundColor: isOn ? `${catColor}20` : "rgba(51,65,85,0.4)",
                    color: isOn ? catColor : "#475569",
                  }}
                >
                  {ICON_MAP[appliance.id] ?? <Zap size={14} />}
                </div>
                <Switch
                  checked={isOn}
                  onCheckedChange={() => toggleAppliance(appliance.id)}
                  aria-label={`Toggle ${appliance.name}`}
                  onClick={(e) => e.stopPropagation()}
                  className="scale-75 origin-right"
                />
              </div>
              {/* Name */}
              <div
                className="text-[10px] font-medium leading-tight truncate"
                style={{ color: isOn ? "#F1F5F9" : "#64748B" }}
              >
                {appliance.hinglishLabel}
              </div>
              {/* Watts */}
              <div
                className="text-[10px] font-bold tabular-nums leading-none"
                style={{ color: isOn ? catColor : "#334155" }}
              >
                {isOn ? `${appliance.watts}W` : "—"}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
