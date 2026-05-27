"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Undo2, HelpCircle } from "lucide-react";
import { useSimStore } from "@/store/simulation-store";

function LogoMark() {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 40 40" width="24" height="24" fill="none" aria-label="SolarSim logo">
        <circle cx="20" cy="20" r="7" stroke="#F6C90E" strokeWidth="2" />
        {[45, 90, 135, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 20 + Math.cos(rad) * 9.5;
          const y1 = 20 + Math.sin(rad) * 9.5;
          const x2 = 20 + Math.cos(rad) * 13;
          const y2 = 20 + Math.sin(rad) * 13;
          return (
            <line
              key={deg}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#F6C90E"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
        <line x1="6" y1="20" x2="34" y2="20" stroke="#F6C90E" strokeWidth="2" />
        <circle cx="6" cy="20" r="1.5" fill="#F6C90E" />
        <circle cx="34" cy="20" r="1.5" fill="#F6C90E" />
      </svg>
      <span className="font-display font-semibold text-text-primary text-base hidden sm:block">
        SolarSim
      </span>
      <span className="font-display font-semibold text-text-primary text-base sm:hidden">
        SS
      </span>
    </div>
  );
}

export function TopBar() {
  const {
    resetToDefault,
    systemOffline,
    inverterOverload,
    systemStatus,
  } = useSimStore();

  const hasAlert = systemOffline || inverterOverload;

  return (
    <header className="flex flex-col border-b border-surface-stroke bg-surface-dark/95 backdrop-blur-md shrink-0">
      {/* ── ROW 1: Logo | Reset + Help ── */}
      <div className="flex items-center justify-between px-3 sm:px-4 h-14 gap-2">
        {/* Left — logo */}
        <div className="flex items-center gap-3 min-w-0">
          <LogoMark />
          {/* Status badge — only on large screens */}
          <AnimatePresence>
            {hasAlert && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="hidden lg:block px-2 py-0.5 rounded-full bg-danger/20 border border-danger/40 text-danger text-[10px] font-semibold truncate max-w-[160px]"
                title={systemStatus}
              >
                {systemStatus}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right — Reset + Help */}
        <div className="flex items-center gap-1.5 justify-end">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetToDefault}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-surface-stroke bg-surface-card/60 text-text-secondary hover:text-text-primary hover:border-solar/40 text-[11px] font-medium transition-colors"
            aria-label="Reset simulator"
            title="Reset to default state"
          >
            <Undo2 size={12} />
            <span className="hidden sm:inline">Reset</span>
          </motion.button>

          <Link
            href="/learn"
            className="flex items-center justify-center w-8 h-8 rounded-full border border-surface-stroke bg-surface-card/60 text-text-secondary hover:text-solar hover:border-solar/40 transition-colors"
            aria-label="Learn — Solar guide"
            title="Learn: On-Grid vs Off-Grid vs Hybrid"
          >
            <HelpCircle size={15} />
          </Link>
        </div>
      </div>
    </header>
  );
}
