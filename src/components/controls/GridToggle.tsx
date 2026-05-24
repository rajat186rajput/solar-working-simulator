"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Zap, ZapOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useSimStore } from "@/store/simulation-store";

export function GridToggle() {
  const { mode, gridAvailable, setGridAvailable } = useSimStore();

  // Grid only relevant for on-grid and hybrid
  if (mode === "off-grid") {
    return (
      <div className="rounded-xl border border-surface-stroke bg-surface-card p-4">
        <div className="flex items-center gap-2 text-text-muted text-xs">
          <ZapOff size={14} />
          <span>Off-Grid mode — no grid connection</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        gridAvailable ? "border-grid bg-surface-card" : "border-danger bg-danger/5"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {gridAvailable ? (
              <motion.div key="on" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Zap size={18} className="text-grid" />
              </motion.div>
            ) : (
              <motion.div
                key="off"
                initial={{ scale: 0 }}
                animate={{
                  scale: 1,
                  x: [0, -3, 3, -3, 3, 0],
                }}
                exit={{ scale: 0 }}
                transition={{ x: { duration: 0.4 } }}
              >
                <ZapOff size={18} className="text-danger" />
              </motion.div>
            )}
          </AnimatePresence>
          <div>
            <div className="text-sm font-medium text-text-primary">
              Grid — UPPCL
            </div>
            <div className={`text-xs font-medium ${gridAvailable ? "text-grid" : "text-danger"}`}>
              {gridAvailable ? "Available ✅" : "FAILED ❌ — Bijli Gayi!"}
            </div>
          </div>
        </div>
        <Switch
          checked={gridAvailable}
          onCheckedChange={setGridAvailable}
          aria-label="Toggle grid availability"
        />
      </div>
      {!gridAvailable && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-2 text-[11px] text-danger/80 leading-relaxed"
        >
          {mode === "on-grid"
            ? "On-Grid: Anti-islanding relay fire karega. Solar bhi band. Ghar mein andhera."
            : "Hybrid: Battery + Solar se chal raha hai. Load continue."}
        </motion.div>
      )}
    </div>
  );
}
