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

export interface ApplianceData {
  id: string;
  name: string;           // English name
  hinglishLabel: string;  // Hinglish display name
  watts: number;          // continuous watts
  surgeWatts: number;     // startup surge
  typicalHoursPerDay: string;
  category: "Cooling" | "Lighting" | "Kitchen" | "Utility" | "Entertainment" | "Vehicle";
  wide?: boolean;          // bento grid 2-col span
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
  panelKwp: number;
  inverterWatts: number;
  appliancesOn: string[];

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
