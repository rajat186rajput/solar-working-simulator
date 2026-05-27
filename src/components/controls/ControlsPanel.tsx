"use client";

import { ZapOff } from "lucide-react";
import { useSimStore } from "@/store/simulation-store";

export function ControlsPanel() {
  const { mode } = useSimStore();

  const showGrid  = mode !== "off-grid";

  return (
    <div className="flex flex-col h-full gap-1.5 overflow-y-auto pr-0.5">
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
