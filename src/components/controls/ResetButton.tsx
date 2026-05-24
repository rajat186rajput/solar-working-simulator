"use client";

import { motion } from "framer-motion";
import { Undo2 } from "lucide-react";
import { useSimStore } from "@/store/simulation-store";

export function ResetButton() {
  const { resetToDefault } = useSimStore();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={resetToDefault}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-surface-card border border-surface-stroke text-text-secondary hover:text-text-primary hover:border-solar/40 px-4 py-2 rounded-full text-xs font-medium shadow-lg transition-colors"
      aria-label="Reset simulator to default state"
    >
      <Undo2 size={14} />
      Reset to Default
    </motion.button>
  );
}
