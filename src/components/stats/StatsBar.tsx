"use client";

import { useSimStore } from "@/store/simulation-store";
import { StatTile } from "./StatTile";
import { formatWh } from "@/lib/utils";
import { ModeToggle } from "@/components/controls/ModeToggle";
import { motion, AnimatePresence } from "framer-motion";

export function StatsBar() {
  const {
    solarW, loadW, batterySoc, gridAvailable,
    netMeterWh, systemStatus, systemOffline, inverterOverload,
    mode,
  } = useSimStore();

  const showBattery = mode === "off-grid" || mode === "hybrid";

  const statusColor = systemOffline || inverterOverload
    ? "#EF4444"
    : solarW > loadW
    ? "#22C55E"
    : solarW > 0
    ? "#F6C90E"
    : "#94A3B8";

  return (
    <div className="sticky top-0 z-50 w-full bg-surface-dark/95 backdrop-blur-md border-b border-surface-stroke">
      <div className="max-w-screen-xl mx-auto px-4 py-2">
        {/* Mode toggle centered */}
        <div className="flex justify-center mb-2">
          <ModeToggle />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
          <StatTile
            label="Solar"
            icon="☀️"
            value={solarW}
            unit="W"
            color="#F6C90E"
          />
          <StatTile
            label="Load"
            icon="⚡"
            value={loadW}
            unit="W"
            color="#F8FAFC"
          />
          {showBattery && (
            <StatTile
              label="Battery"
              icon="🔋"
              value={Math.round(batterySoc * 100)}
              unit="%"
              color={
                batterySoc >= 0.8 ? "#22C55E"
                : batterySoc >= 0.4 ? "#EAB308"
                : batterySoc >= 0.2 ? "#F97316"
                : "#EF4444"
              }
            />
          )}
          <StatTile
            label="Grid"
            icon="🔌"
            value={0}
            textValue={gridAvailable ? "OK ✅" : "FAIL ❌"}
            textColor={gridAvailable ? "#22C55E" : "#EF4444"}
          />
          <StatTile
            label="Net Meter"
            icon="📊"
            value={netMeterWh}
            formatFn={formatWh}
            color={netMeterWh >= 0 ? "#22C55E" : "#EF4444"}
          />
          <div className="col-span-3 md:col-span-1 px-3 py-2 flex flex-col justify-center">
            <div className="text-[10px] text-text-secondary uppercase tracking-wide mb-0.5">Status</div>
            <AnimatePresence mode="wait">
              <motion.div
                key={systemStatus}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-xs font-medium leading-tight"
                style={{ color: statusColor }}
              >
                {systemStatus}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
