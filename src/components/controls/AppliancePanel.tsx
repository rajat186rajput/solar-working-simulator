"use client";

import { APPLIANCES, CATEGORY_COLORS } from "@/lib/appliances";
import { useSimStore } from "@/store/simulation-store";
import { ApplianceCard } from "./ApplianceCard";

const CATEGORIES = ["Cooling", "Lighting", "Kitchen", "Utility", "Entertainment", "Vehicle"] as const;

export function AppliancePanel() {
  const { appliancesOn, toggleAppliance } = useSimStore();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text-primary font-display">Appliances</h3>
      {CATEGORIES.map((cat) => {
        const items = APPLIANCES.filter((a) => a.category === cat);
        if (items.length === 0) return null;
        const catColor = CATEGORY_COLORS[cat] || "#94A3B8";
        return (
          <div key={cat}>
            <div
              className="text-[10px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: catColor }}
            >
              {cat}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {items.map((appliance) => (
                <ApplianceCard
                  key={appliance.id}
                  appliance={appliance}
                  isOn={appliancesOn.includes(appliance.id)}
                  onToggle={() => toggleAppliance(appliance.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
