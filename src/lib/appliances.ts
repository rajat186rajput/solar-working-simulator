import type { ApplianceData } from "./types";

export const APPLIANCES: ApplianceData[] = [
  {
    id: "ac",
    name: "1.5 Ton AC",
    hinglishLabel: "AC (1.5 Ton)",
    watts: 1400,
    surgeWatts: 3000,
    typicalHoursPerDay: "6-10 hr",
    category: "Cooling",
    wide: true,
  },
  {
    id: "fan",
    name: "Ceiling Fan",
    hinglishLabel: "Ceiling Fan",
    watts: 75,
    surgeWatts: 100,
    typicalHoursPerDay: "12 hr",
    category: "Cooling",
  },
  {
    id: "light",
    name: "LED Light (9W)",
    hinglishLabel: "LED Bulb",
    watts: 9,
    surgeWatts: 9,
    typicalHoursPerDay: "8 hr",
    category: "Lighting",
  },
  {
    id: "fridge",
    name: "Refrigerator",
    hinglishLabel: "Fridge",
    watts: 150,
    surgeWatts: 600,
    typicalHoursPerDay: "24 hr",
    category: "Kitchen",
  },
  {
    id: "tv",
    name: "LED TV (43\")",
    hinglishLabel: "TV",
    watts: 100,
    surgeWatts: 100,
    typicalHoursPerDay: "4-6 hr",
    category: "Entertainment",
  },
  {
    id: "pump",
    name: "Water Pump (1 HP)",
    hinglishLabel: "Water Pump",
    watts: 750,
    surgeWatts: 1500,
    typicalHoursPerDay: "1-2 hr",
    category: "Utility",
  },
  {
    id: "geyser",
    name: "Geyser (15L)",
    hinglishLabel: "Geyser",
    watts: 2000,
    surgeWatts: 2000,
    typicalHoursPerDay: "0.25-0.5 hr",
    category: "Kitchen",
  },
  {
    id: "washing",
    name: "Washing Machine",
    hinglishLabel: "Washing Machine",
    watts: 400,
    surgeWatts: 800,
    typicalHoursPerDay: "1 hr",
    category: "Utility",
  },
  {
    id: "microwave",
    name: "Microwave (800W)",
    hinglishLabel: "Microwave",
    watts: 800,
    surgeWatts: 800,
    typicalHoursPerDay: "0.25 hr",
    category: "Kitchen",
  },
  {
    id: "iron",
    name: "Iron (1000W)",
    hinglishLabel: "Press / Iron",
    watts: 1000,
    surgeWatts: 1000,
    typicalHoursPerDay: "0.5 hr",
    category: "Utility",
  },
  {
    id: "mixer",
    name: "Mixer/Grinder",
    hinglishLabel: "Mixer",
    watts: 500,
    surgeWatts: 900,
    typicalHoursPerDay: "0.25 hr",
    category: "Kitchen",
  },
  {
    id: "ev",
    name: "EV Charger (3.3 kW)",
    hinglishLabel: "EV Charger",
    watts: 3300,
    surgeWatts: 3300,
    typicalHoursPerDay: "2-4 hr",
    category: "Vehicle",
    wide: true,
  },
];

// Default ON appliances for Mandawar summer afternoon
export const DEFAULT_APPLIANCES_ON = ["ac", "fan", "light", "fridge", "tv"];

export function getApplianceById(id: string): ApplianceData | undefined {
  return APPLIANCES.find((a) => a.id === id);
}

export function calcTotalLoad(appliancesOn: string[]): number {
  // For AC, multiply by 2 (default 2 ACs in Mandawar config)
  return appliancesOn.reduce((sum, id) => {
    const a = getApplianceById(id);
    if (!a) return sum;
    if (id === "ac") return sum + a.watts * 2; // 2 x 1.5T AC = 2800W
    return sum + a.watts;
  }, 0);
}

export const CATEGORY_COLORS: Record<string, string> = {
  Cooling: "#67E8F9",
  Kitchen: "#FDE68A",
  Utility: "#A78BFA",
  Vehicle: "#86EFAC",
  Lighting: "#FEF08A",
  Entertainment: "#FDA4AF",
};
