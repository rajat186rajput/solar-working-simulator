"use client";

import { SCENARIOS } from "@/lib/scenarios";
import { ScenarioCard } from "./ScenarioCard";

export function ScenarioGrid() {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-text-primary font-display">Scenarios</h3>
      <div className="grid grid-cols-2 gap-2">
        {SCENARIOS.map((s) => (
          <ScenarioCard key={s.id} scenario={s} />
        ))}
      </div>
    </div>
  );
}
