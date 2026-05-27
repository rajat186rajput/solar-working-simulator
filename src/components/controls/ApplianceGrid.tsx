"use client";

import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { APPLIANCES, CATEGORY_COLORS } from "@/lib/appliances";
import { useSimStore } from "@/store/simulation-store";
import { L } from "@/lib/i18n";
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
  const { applianceQtys, toggleAppliance, setApplianceQty, lang } = useSimStore();

  return (
    <div className="flex flex-col h-full">
      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
        Appliances
      </div>
      {/* 3-column grid — all appliances */}
      <div className="grid grid-cols-3 gap-1 content-start">
        {APPLIANCES.map((appliance) => {
          const entry = applianceQtys.find((e) => e.id === appliance.id);
          const isOn = entry?.isOn ?? false;
          const qty = entry?.qty ?? 1;
          const catColor = CATEGORY_COLORS[appliance.category] || "#94A3B8";

          return (
            <motion.div
              key={appliance.id}
              whileHover={{ y: -1, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              animate={{
                opacity: isOn ? 1 : 0.5,
              }}
              transition={{ duration: 0.2 }}
              className="relative rounded-lg border p-1.5 select-none flex flex-col gap-0.5 overflow-hidden"
              style={{
                background: isOn
                  ? "rgba(30, 41, 59, 0.75)"
                  : "rgba(15, 23, 42, 0.45)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                borderColor: isOn ? catColor : "#334155",
                boxShadow: isOn
                  ? `0 0 10px ${catColor}28, inset 0 0 10px ${catColor}0a`
                  : "none",
                transition: "all 0.2s ease",
              }}
              role="checkbox"
              aria-checked={isOn}
              aria-label={`Toggle ${appliance.name} (${appliance.watts}W × ${qty})`}
            >
              {/* Category color accent strip — top border */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: isOn ? catColor : "transparent",
                  borderRadius: "8px 8px 0 0",
                  transition: "background 0.2s ease",
                }}
              />

              {/* Icon + switch row */}
              <div className="flex items-center justify-between mt-0.5">
                <div
                  className="p-1 rounded cursor-pointer"
                  style={{
                    backgroundColor: isOn ? `${catColor}25` : "rgba(51,65,85,0.4)",
                    color: isOn ? catColor : "#475569",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => toggleAppliance(appliance.id)}
                >
                  {ICON_MAP[appliance.id] ?? <Zap size={14} />}
                </div>
                <span className="inline-flex items-center justify-center p-2 -m-2 min-h-[44px]">
                  <Switch
                    checked={isOn}
                    onCheckedChange={() => toggleAppliance(appliance.id)}
                    aria-label={`Toggle ${appliance.name}`}
                    className="scale-75 origin-right"
                  />
                </span>
              </div>

              {/* Name */}
              <div
                className="text-[10px] font-medium leading-tight truncate cursor-pointer"
                style={{
                  color: isOn ? "#F1F5F9" : "#64748B",
                  transition: "color 0.2s ease",
                }}
                onClick={() => toggleAppliance(appliance.id)}
              >
                {lang === "hi" ? appliance.hinglishLabel : appliance.name}
              </div>

              {/* Per-item wattage */}
              <div className="text-[10px] leading-none" style={{ color: "#475569" }}>
                {appliance.watts}{L(lang, "wEach")}
              </div>

              {/* Qty counter — top-right overlay badge */}
              <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-black/40 rounded px-0.5">
                <button
                  onClick={(e) => { e.stopPropagation(); setApplianceQty(appliance.id, qty - 1); }}
                  disabled={qty <= 0}
                  className="text-[10px] w-4 h-4 flex items-center justify-center text-text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label={`Decrease ${appliance.name} quantity`}
                >
                  −
                </button>
                <span className="text-[10px] font-semibold text-white min-w-[10px] text-center">{qty}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setApplianceQty(appliance.id, qty + 1); }}
                  disabled={qty >= 10}
                  className="text-[10px] w-4 h-4 flex items-center justify-center text-text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label={`Increase ${appliance.name} quantity`}
                >
                  +
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
