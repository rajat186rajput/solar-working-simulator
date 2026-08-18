export type Mode = "on-grid" | "off-grid" | "hybrid";
export type DayType = "clear" | "cloudy" | "monsoon";
export type BatteryType = "lifepo4" | "lead-acid";
export type FlowType =
  | "solar"
  | "battery-charge"
  | "battery-discharge"
  | "grid-import"
  | "grid-export"
  | "load";

// ─── Real Setup — House No. 89 (as-built mode) ──────────────────────────────
// simView is a PEER of the 3 Learn architectures (Mode), not a replacement.
// See 03_ASBUILT.md + 03_REAL_SETUP_DESIGN.md — Developer Handoff Checklist.
export type SimView = "learn" | "real-setup";
export type ConnectionId = "connection-1" | "connection-2";
// UTL Sigma UGE5048 front-panel modes, priority chains verbatim from the manual.
export type PcuMode = "pcu" | "smart" | "hybrid-pcu" | "grid-export";
export type OverloadBand = "none" | "amber" | "red" | "critical";

export interface ApplianceData {
  id: string;
  name: string;           // English name
  hinglishLabel: string;  // Hinglish display name
  watts: number;          // continuous watts
  surgeWatts: number;     // startup surge
  typicalHoursPerDay: string;
  category: "Cooling" | "Lighting" | "Kitchen" | "Utility" | "Entertainment" | "Vehicle" | "Office" | "Personal Care";
  wide?: boolean;          // bento grid 2-col span
  defaultQty?: number;     // default quantity (1 if omitted)
}

export interface ApplianceQtyEntry {
  id: string;
  qty: number;
  isOn: boolean;
  gridOnly?: boolean;  // if true, this appliance only draws from grid (excluded from solar/battery load)
}

export interface ScenarioPreset {
  id: string;
  title: string;
  description: string;
  timeHour: number;
  dayType: DayType;
  batterySoc: number;
  gridAvailable: boolean;
  appliancesOn: string[];   // appliance IDs
  modeOutcomes: {
    "on-grid": "good" | "bad" | "warn";
    "off-grid": "good" | "bad" | "warn";
    hybrid: "good" | "bad" | "warn";
  };
}

export interface SimResult {
  solarW: number;
  loadW: number;
  gridImportW: number;
  gridExportW: number;
  batteryChargeW: number;
  batteryDischargeW: number;
  netMeterWh: number;
  systemStatus: string;
  systemOffline: boolean;
  surgeActive: boolean;
  batteryNewSoc: number;
  inverterOverload: boolean;
}

export interface SimState {
  mode: Mode;
  timeHour: number;
  dayType: DayType;
  gridAvailable: boolean;
  batterySoc: number;
  batteryKwh: number;
  batteryType: BatteryType;
  batteryOn: boolean;
  panelKwp: number;
  solarOn: boolean;
  inverterWatts: number;
  appliancesOn: string[];
  applianceQtys: ApplianceQtyEntry[];
  gridOnlyAppliances: Set<string>;  // appliance IDs that are "Grid Only"

  // Computed:
  solarW: number;
  loadW: number;
  gridImportW: number;
  gridExportW: number;
  batteryChargeW: number;
  batteryDischargeW: number;
  netMeterWh: number;
  systemStatus: string;
  systemOffline: boolean;
  surgeActive: boolean;
  inverterOverload: boolean;

  // Status message log
  statusLog: string[];
}
