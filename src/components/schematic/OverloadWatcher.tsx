"use client";

// Real wall-clock overload countdown (03_ASBUILT.md §2.2 "Overload" row):
// 100–120% of the 4 kW PCU cap trips in 60s, 120–150% trips in 30s, >150% is
// effectively immediate (handled inside lib/realSetup.ts's getOverloadBand /
// runPcuSimulation directly — that's a pure function and cannot own a wall
// clock, so the countdown itself lives here as a side-effect-only component).
//
// No visual output — mounted once inside SchematicSVG when simView is
// "real-setup". Reads overloadBand from the store (computed every recompute)
// and drives pcuTripped + overloadRemainingSec.

import { useEffect, useRef } from "react";
import { useSimStore } from "@/store/simulation-store";
import { OVERLOAD_AMBER_SEC, OVERLOAD_RED_SEC } from "@/lib/realSetup";

export function OverloadWatcher() {
  const overloadBand = useSimStore((s) => s.overloadBand);
  const pcuTripped = useSimStore((s) => s.pcuTripped);
  const setPcuTripped = useSimStore((s) => s.setPcuTripped);
  const setOverloadRemainingSec = useSimStore((s) => s.setOverloadRemainingSec);

  const bandRef = useRef(overloadBand);
  const remainingRef = useRef<number | null>(null);

  useEffect(() => {
    // "critical" (>150%) trips effectively immediately — no countdown needed.
    if (overloadBand === "critical" && !pcuTripped) {
      setOverloadRemainingSec(0);
      setPcuTripped(true);
      return;
    }

    // Load dropped back under the cap — auto-recover (real breakers still
    // need a reduce-load step; the "reset" half is the always-available
    // TopBar Reset button, which also clears this).
    if (overloadBand === "none") {
      bandRef.current = "none";
      remainingRef.current = null;
      setOverloadRemainingSec(null);
      if (pcuTripped) setPcuTripped(false);
      return;
    }

    if (pcuTripped) return; // already tripped — freeze, wait for load reduction/reset

    // Fresh entry into amber/red (or de/escalating) — (re)start the countdown.
    if (bandRef.current !== overloadBand) {
      bandRef.current = overloadBand;
      remainingRef.current = overloadBand === "red" ? OVERLOAD_RED_SEC : OVERLOAD_AMBER_SEC;
      setOverloadRemainingSec(remainingRef.current);
    }

    const interval = setInterval(() => {
      if (remainingRef.current === null) return;
      remainingRef.current -= 1;
      if (remainingRef.current <= 0) {
        setOverloadRemainingSec(0);
        setPcuTripped(true);
        clearInterval(interval);
      } else {
        setOverloadRemainingSec(remainingRef.current);
      }
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overloadBand, pcuTripped]);

  return null;
}
