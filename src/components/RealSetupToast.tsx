"use client";

// F.2 — contextual one-shot toast for the 3 family rules (Section F.2 / G.6).
// Detects the rule-violating combination the instant it occurs (edge-trigger,
// not every render) and reuses the exact GridToggle.tsx shake idiom.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useSimStore } from "@/store/simulation-store";
import { L, type LabelKey } from "@/lib/i18n";
import type { OverloadBand } from "@/lib/types";

interface RuleFlags {
  geyser: boolean;
  twoAc: boolean;
  ev: boolean;
}

export function RealSetupToast() {
  const simView = useSimStore((s) => s.simView);
  const applianceQtys = useSimStore((s) => s.applianceQtys);
  const gridAvailable = useSimStore((s) => s.gridAvailable);
  const lang = useSimStore((s) => s.lang);
  const appendStatusLog = useSimStore((s) => s.appendStatusLog);
  const overloadBand = useSimStore((s) => s.overloadBand);
  const pcuTripped = useSimStore((s) => s.pcuTripped);
  const reduceMotion = useReducedMotion();

  const [toast, setToast] = useState<{ key: string; labelKey: LabelKey } | null>(null);
  const prevRef = useRef<RuleFlags>({ geyser: false, twoAc: false, ev: false });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (simView !== "real-setup") return;

    const ac = applianceQtys.find((e) => e.id === "ac");
    const geyser = applianceQtys.find((e) => e.id === "geyser");
    const ev = applianceQtys.find((e) => e.id === "ev");

    const flags: RuleFlags = {
      geyser: !!(ac?.isOn && geyser?.isOn),
      twoAc: !!(ac?.isOn && ac.qty >= 2),
      ev: !!(ev?.isOn && !gridAvailable),
    };

    const prev = prevRef.current;
    let next: { key: string; labelKey: LabelKey } | null = null;
    if (flags.geyser && !prev.geyser) next = { key: "geyser", labelKey: "ruleGeyser" };
    else if (flags.twoAc && !prev.twoAc) next = { key: "twoAc", labelKey: "rule2AC" };
    else if (flags.ev && !prev.ev) next = { key: "ev", labelKey: "ruleEV" };

    prevRef.current = flags;

    if (next) {
      setToast(next);
      appendStatusLog(L(lang, next.labelKey));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setToast(null), 5000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simView, applianceQtys, gridAvailable]);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  // R11 (code review): the house-node SVG overload text is shortened on
  // mobile ("⚠ 57s") to fit the node — this toast is the mobile fallback
  // slot that carries the FULL copy (never colour-only). Edge-triggered on
  // band/trip transitions so it doesn't refire every recompute tick.
  const prevBandRef = useRef<OverloadBand>("none");
  const prevTrippedRef = useRef(false);
  useEffect(() => {
    if (simView !== "real-setup") return;

    let labelKey: LabelKey | null = null;
    if (pcuTripped && !prevTrippedRef.current) {
      labelKey = "overloadTripped";
    } else if (!pcuTripped && overloadBand !== prevBandRef.current) {
      if (overloadBand === "red") labelKey = "overloadRed";
      else if (overloadBand === "amber") labelKey = "overloadAmber";
    }
    prevBandRef.current = overloadBand;
    prevTrippedRef.current = pcuTripped;

    if (labelKey) {
      const key = `overload-${labelKey}`;
      setToast({ key, labelKey });
      appendStatusLog(L(lang, labelKey));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setToast(null), 5000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simView, overloadBand, pcuTripped]);

  if (simView !== "real-setup") return null;

  return (
    <div className="fixed top-28 sm:top-16 left-1/2 -translate-x-1/2 z-[60] w-[min(92vw,420px)] pointer-events-none">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.key}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
            animate={
              reduceMotion
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, x: [0, -3, 3, -3, 3, 0] }
            }
            exit={{ opacity: 0 }}
            transition={
              reduceMotion
                ? { duration: 0.2 }
                : { x: { duration: 0.4 }, opacity: { duration: 0.2 }, scale: { duration: 0.2 } }
            }
            className="pointer-events-auto flex items-start gap-2 rounded-xl border border-warning/50 bg-surface-dark/95 backdrop-blur-md px-3 py-2.5 shadow-lg"
            role="alert"
          >
            <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
            <span className="text-xs text-text-primary leading-snug flex-1">
              {L(lang, toast.labelKey)}
            </span>
            <button
              onClick={() => setToast(null)}
              aria-label="Dismiss"
              className="text-text-muted hover:text-text-primary text-sm leading-none shrink-0"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
