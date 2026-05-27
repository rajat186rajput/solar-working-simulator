import type { ApplianceData, ApplianceQtyEntry } from "./types";

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
    defaultQty: 2,
  },
  {
    id: "fan",
    name: "Ceiling Fan",
    hinglishLabel: "Ceiling Fan",
    watts: 75,
    surgeWatts: 100,
    typicalHoursPerDay: "12 hr",
    category: "Cooling",
    defaultQty: 4,
  },
  {
    id: "light",
    name: "LED Light (9W)",
    hinglishLabel: "LED Bulb",
    watts: 9,
    surgeWatts: 9,
    typicalHoursPerDay: "8 hr",
    category: "Lighting",
    defaultQty: 6,
  },
  {
    id: "fridge",
    name: "Refrigerator",
    hinglishLabel: "Fridge",
    watts: 150,
    surgeWatts: 600,
    typicalHoursPerDay: "24 hr",
    category: "Kitchen",
    defaultQty: 1,
  },
  {
    id: "tv",
    name: "LED TV (43\")",
    hinglishLabel: "TV",
    watts: 100,
    surgeWatts: 100,
    typicalHoursPerDay: "4-6 hr",
    category: "Entertainment",
    defaultQty: 1,
  },
  {
    id: "pump",
    name: "Water Pump (1 HP)",
    hinglishLabel: "Water Pump",
    watts: 750,
    surgeWatts: 1500,
    typicalHoursPerDay: "1-2 hr",
    category: "Utility",
    defaultQty: 1,
  },
  {
    id: "geyser",
    name: "Geyser (15L)",
    hinglishLabel: "Geyser",
    watts: 2000,
    surgeWatts: 2000,
    typicalHoursPerDay: "0.25-0.5 hr",
    category: "Kitchen",
    defaultQty: 1,
  },
  {
    id: "washing",
    name: "Washing Machine",
    hinglishLabel: "Washing Machine",
    watts: 400,
    surgeWatts: 800,
    typicalHoursPerDay: "1 hr",
    category: "Utility",
    defaultQty: 1,
  },
  {
    id: "microwave",
    name: "Microwave (800W)",
    hinglishLabel: "Microwave",
    watts: 800,
    surgeWatts: 800,
    typicalHoursPerDay: "0.25 hr",
    category: "Kitchen",
    defaultQty: 1,
  },
  {
    id: "iron",
    name: "Iron (1000W)",
    hinglishLabel: "Press / Iron",
    watts: 1000,
    surgeWatts: 1000,
    typicalHoursPerDay: "0.5 hr",
    category: "Utility",
    defaultQty: 1,
  },
  {
    id: "mixer",
    name: "Mixer/Grinder",
    hinglishLabel: "Mixer",
    watts: 500,
    surgeWatts: 900,
    typicalHoursPerDay: "0.25 hr",
    category: "Kitchen",
    defaultQty: 1,
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
    defaultQty: 1,
  },
];

// Default ON appliances for Mandawar summer afternoon
export const DEFAULT_APPLIANCES_ON = ["ac", "fan", "light", "fridge", "tv"];

// Build default ApplianceQtyEntry array — qty comes from defaultQty, isOn from DEFAULT_APPLIANCES_ON
export const DEFAULT_APPLIANCE_QTYS: ApplianceQtyEntry[] = APPLIANCES.map((a) => ({
  id: a.id,
  qty: a.defaultQty ?? 1,
  isOn: DEFAULT_APPLIANCES_ON.includes(a.id),
}));

export function getApplianceById(id: string): ApplianceData | undefined {
  return APPLIANCES.find((a) => a.id === id);
}

/**
 * Legacy helper — used when qty map not available (scenario presets etc.)
 */
export function calcTotalLoad(appliancesOn: string[]): number {
  return appliancesOn.reduce((sum, id) => {
    const a = getApplianceById(id);
    if (!a) return sum;
    return sum + a.watts;
  }, 0);
}

/**
 * New quantity-aware load calculation.
 * loadW = sum of (qty × watts) for all isOn appliances.
 * If gridOnlyAppliances is provided and gridAvailable is false,
 * those appliances are excluded from the load (they only run on grid).
 */
export function calcTotalLoadQty(
  qtys: ApplianceQtyEntry[],
  gridAvailable?: boolean,
  gridOnlyAppliances?: Set<string>,
): number {
  return qtys.reduce((sum, entry) => {
    if (!entry.isOn) return sum;
    // Skip grid-only appliances when grid is unavailable
    if (
      gridOnlyAppliances?.has(entry.id) &&
      gridAvailable === false
    ) {
      return sum;
    }
    const a = getApplianceById(entry.id);
    if (!a) return sum;
    return sum + entry.qty * a.watts;
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
