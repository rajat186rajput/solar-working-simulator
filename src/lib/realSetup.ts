// ─── Real Setup — House No. 89 (as-built mode) ──────────────────────────────
// Source of truth: Projects/Personal/3 Solar Working Simulator/03_ASBUILT.md §1–§4
// UI/motion spec: Resources/Brand Assets/web-components/solar-working-simulator/03_REAL_SETUP_DESIGN.md
//
// This module is intentionally SEPARATE from lib/simulation.ts (the generic
// Learn-mode engine) so the 3 existing architectures (on-grid/off-grid/hybrid)
// cannot regress — see Developer Handoff Checklist item 1 in the design spec.

import type {
  BatteryType,
  ConnectionId,
  DayType,
  OverloadBand,
  PcuMode,
} from "./types";
import type { LabelKey } from "./i18n";
import { getSolarW } from "./solar-curve";
import { clamp } from "./utils";
import {
  LOW_SOC_CUTOFF,
  C_RATE,
  VOLTAGE,
  getBatteryUsableKwh,
} from "./simulation";

const TICK_HOURS = 1;

// ─── As-built hardware constants (03_ASBUILT.md §2) ─────────────────────────
export const REAL_SETUP_PANEL_KWP = 4.8;
export const REAL_SETUP_BATTERY_KWH = 7.2;
export const REAL_SETUP_BATTERY_TYPE: BatteryType = "lead-acid";
export const REAL_SETUP_DAY_TYPE: DayType = "clear";

/** Battery-mode continuous output cap (UGE5048 nameplate) — applies to all 4 PCU modes' AC output. */
export const PCU_CAP_W = 4000;
/** Mains-mode rating, PF 0.8 (nameplate only, informational — not used in overload math). */
export const PCU_MAINS_VA = 5000;
/** Transformer-based PCU — real-world efficiency, not the generic 0.95 used by Learn mode. */
export const PCU_EFF = 0.90;

/** SPV (solar) battery-charge current default + derived watt cap (18A × ~54V per manual). */
export const SPV_CHARGE_A_DEFAULT = 18;
export const SPV_CHARGE_A_MIN = 12;
export const SPV_CHARGE_A_MAX = 60;
export const CHARGE_VOLTAGE = 54; // approx bank charge voltage (4×13.5V-ish)
export const SPV_CHARGE_CAP_W = SPV_CHARGE_A_DEFAULT * CHARGE_VOLTAGE; // ≈ 972W

/** Grid (AC) battery-charge current default + derived watt cap. */
export const GRID_CHARGE_A_DEFAULT = 10;
export const GRID_CHARGE_CAP_W = GRID_CHARGE_A_DEFAULT * CHARGE_VOLTAGE; // ≈ 540W

// Overload timer bands (03_ASBUILT.md §2.2 "Overload" row, IT-load-disabled column)
export const OVERLOAD_AMBER_SEC = 60; // 100–120%
export const OVERLOAD_RED_SEC = 30;   // 120–150%

export function getOverloadBand(loadW: number, capW: number = PCU_CAP_W): OverloadBand {
  const ratio = loadW / capW;
  if (ratio < 1.0) return "none";
  if (ratio < 1.2) return "amber";
  if (ratio < 1.5) return "red";
  return "critical"; // >150% — trips effectively immediately
}

function getMaxBatteryRateW(batteryKwh: number, batteryType: BatteryType): number {
  const voltage = VOLTAGE[batteryType];
  const ah = (batteryKwh * 1000) / voltage;
  return Math.min(ah * C_RATE[batteryType] * voltage, PCU_CAP_W);
}

// ─── Connection selector (03_ASBUILT.md §3 + §1 topology) ───────────────────
export const CONNECTIONS: ConnectionId[] = ["connection-1", "connection-2"];

/**
 * Default ON appliance ids per connection — split from the existing
 * ApplianceData[] catalog (no new appliance types invented). Both connections
 * share the always-on household baseline (fan/light/fridge/tv ≈ 655W per
 * 03_ASBUILT §3) and each gets ONE differentiating big load so the two
 * connections are visibly different without instantly violating a family
 * rule at boot (AC+geyser together, or EV during a cut, are still reachable
 * by the user toggling appliances — that's the point of the F.2 toast).
 */
export const CONNECTION_DEFAULT_APPLIANCES: Record<ConnectionId, string[]> = {
  "connection-1": ["fan", "light", "fridge", "tv", "ac"],     // Arun's side — AC-heavy
  "connection-2": ["fan", "light", "fridge", "tv", "pump"],   // Rajat's side — pump-heavy
};

export const CONNECTION_DEFAULT_BATTERY_SOC: Record<ConnectionId, number> = {
  "connection-1": 0.72,
  "connection-2": 0.86,
};

export function otherConnection(id: ConnectionId): ConnectionId {
  return id === "connection-1" ? "connection-2" : "connection-1";
}

// ─── PCU mode priority chains (verbatim from UTL Sigma manual, 03_ASBUILT §2.2) ─
export type FlowNode = "solar" | "battery" | "grid";

export const PCU_PRIORITY_CHAINS: Record<
  PcuMode,
  { load: FlowNode[]; charge?: FlowNode[]; day?: FlowNode[]; night?: FlowNode[] }
> = {
  pcu:          { load: ["solar", "battery", "grid"] },
  smart:        { day: ["solar", "battery", "grid"], night: ["grid", "battery"], load: ["solar", "battery", "grid"] },
  "hybrid-pcu": { load: ["grid", "solar", "battery"], charge: ["solar", "grid"] },
  "grid-export":{ load: ["solar", "grid", "battery"] },
};

// ─── System nameplate data (03_ASBUILT.md §2 — technical only, no cost/accounts) ─
export const NAMEPLATE = {
  module: {
    name: "UTL Solar UTL600-144GT",
    countPerConnection: 8,
    arrayKwp: REAL_SETUP_PANEL_KWP,
    stcPmax: "600 W",
    vocIsc: "52.13 V / 14.25 A",
    vmpImp: "44.82 V / 13.39 A",
    type: "TOPCon n-type, bifacial",
  },
  pcu: {
    name: "UTL Sigma / UGE5048",
    mainsRating: "5 kVA (PF 0.8)",
    batteryModeCap: "4 kW",
    spvChargeCurrent: "18 A (default)",
    efficiency: "~90%",
  },
  battery: {
    name: "4 × 150 Ah, 12 V lead-acid",
    bank: "48 V / 150 Ah (7.2 kWh)",
    usable: "~3.6 kWh (50% DoD)",
    lowCut: "44 V bank (11.0 V/cell)",
  },
};

// ─── Simulation input/output ─────────────────────────────────────────────────
export interface RealSetupInput {
  pcuMode: PcuMode;
  timeHour: number;
  dayType: DayType;
  gridAvailable: boolean;
  netMeterInstalled: boolean;
  batterySoc: number;
  batteryKwh: number;
  batteryType: BatteryType;
  batteryOn: boolean;
  panelKwp: number;
  solarOn: boolean;
  loadW: number;
  currentNetMeterWh: number;
  /** Latched from outside (wall-clock overload timer) — see components/OverloadWatcher.tsx */
  pcuTripped: boolean;
}

export interface RealSetupResult {
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
  inverterOverload: boolean; // aliases isTripped — kept for TopBar hasAlert compat
  overloadBand: OverloadBand;
  /** When set, the store should render L(lang, statusKey) instead of systemStatus (i18n Copy Register). */
  statusKey?: LabelKey;
}

export function runPcuSimulation(input: RealSetupInput): RealSetupResult {
  const {
    pcuMode,
    timeHour,
    dayType,
    gridAvailable,
    netMeterInstalled,
    batterySoc,
    batteryKwh,
    batteryType,
    batteryOn,
    panelKwp,
    solarOn,
    loadW: rawLoadW,
    currentNetMeterWh,
    pcuTripped,
  } = input;

  const solarW = solarOn ? getSolarW(timeHour, dayType, panelKwp) : 0;
  const isDay = solarW > 0;
  const surplus = solarW - rawLoadW;
  const deficit = Math.max(0, -surplus);

  const batteryUsableKwh = getBatteryUsableKwh(batteryKwh, batteryType, PCU_EFF);
  const lowCutoff = LOW_SOC_CUTOFF[batteryType];
  const batteryEffectivelyOff = !batteryOn || batteryKwh <= 0;
  const activeSoc = batteryEffectivelyOff ? 0 : batterySoc;
  const maxRateW = getMaxBatteryRateW(batteryKwh, batteryType);

  const overloadBand = getOverloadBand(rawLoadW, PCU_CAP_W);
  const isTripped = pcuTripped || overloadBand === "critical";

  if (isTripped) {
    return {
      solarW: 0,
      loadW: rawLoadW,
      gridImportW: 0,
      gridExportW: 0,
      batteryChargeW: 0,
      batteryDischargeW: 0,
      netMeterWh: currentNetMeterWh,
      systemStatus: "PCU tripped — reduce load and reset",
      systemOffline: true,
      surgeActive: false,
      batteryNewSoc: batterySoc,
      inverterOverload: true,
      overloadBand,
      statusKey: "overloadTripped",
    };
  }

  let gridImportW = 0;
  let gridExportW = 0;
  let batteryChargeW = 0;
  let batteryDischargeW = 0;
  let netMeterWh = currentNetMeterWh;
  let systemStatus = "";
  let systemOffline = false;
  let batteryNewSoc = batterySoc;

  // ── Shared helpers (used by multiple mode branches) ──
  function chargeFromSolar(availableSolarSurplusW: number): number {
    if (batteryEffectivelyOff || activeSoc >= 1.0) return 0;
    const chargeW = Math.min(availableSolarSurplusW, SPV_CHARGE_CAP_W, maxRateW);
    if (chargeW <= 0) return 0;
    batteryChargeW = chargeW;
    const deltaKwh = (chargeW * TICK_HOURS) / 1000;
    batteryNewSoc = clamp(batterySoc + deltaKwh / batteryUsableKwh, 0, 1);
    if (batteryNewSoc >= 0.99) batteryNewSoc = 1.0;
    return chargeW;
  }

  function chargeFromGrid(capW: number): number {
    if (batteryEffectivelyOff || activeSoc >= 1.0) return 0;
    const chargeW = Math.min(capW, maxRateW);
    if (chargeW <= 0) return 0;
    batteryChargeW = chargeW;
    const deltaKwh = (chargeW * TICK_HOURS) / 1000;
    batteryNewSoc = clamp(batterySoc + deltaKwh / batteryUsableKwh, 0, 1);
    if (batteryNewSoc >= 0.99) batteryNewSoc = 1.0;
    return chargeW;
  }

  function dischargeToward(targetW: number): number {
    if (batteryEffectivelyOff || activeSoc <= lowCutoff) return 0;
    const dischargeW = Math.min(targetW, maxRateW);
    if (dischargeW <= 0) return 0;
    batteryDischargeW = dischargeW;
    const deltaKwh = (dischargeW * TICK_HOURS) / 1000;
    batteryNewSoc = clamp(batterySoc - deltaKwh / batteryUsableKwh, 0, 1);
    return dischargeW;
  }

  // ── PCU mode: Solar → Battery → Grid (always, no day/night switch) ──
  function runPcuChain() {
    if (surplus >= 0) {
      const charged = chargeFromSolar(surplus);
      systemStatus = charged > 0
        ? "Solar poora load de raha hai, battery bhi charge ho rahi hai"
        : !batteryEffectivelyOff
          ? "Battery full — extra solar is waste ho rahi hai (net-meter nahi hai is mode mein)"
          : "Battery disconnected — solar se seedha load chal raha hai";
    } else {
      const discharged = dischargeToward(deficit);
      const stillDeficit = deficit - discharged;
      if (stillDeficit > 1) {
        if (gridAvailable) {
          gridImportW = stillDeficit;
          netMeterWh -= stillDeficit * TICK_HOURS;
          systemStatus = discharged > 0
            ? "Solar kam — battery + grid dono se load chal raha hai"
            : "Battery khali/band — grid se load chal raha hai";
        } else {
          systemOffline = true;
          systemStatus = "Solar kam, battery khali, grid bhi nahi — system offline";
        }
      } else {
        systemStatus = "Solar kam — battery se load chal raha hai";
      }
    }
  }

  if (pcuMode === "pcu") {
    runPcuChain();
  } else if (pcuMode === "smart") {
    if (isDay) {
      runPcuChain();
    } else if (gridAvailable) {
      const charged = chargeFromGrid(GRID_CHARGE_CAP_W);
      gridImportW = rawLoadW + charged;
      netMeterWh -= gridImportW * TICK_HOURS;
      systemStatus = charged > 0
        ? "Raat — SMART mode: grid se load chal raha hai aur battery bhi charge ho rahi hai"
        : "Raat — grid se load chal raha hai (battery full)";
    } else {
      const discharged = dischargeToward(rawLoadW);
      if (discharged >= rawLoadW - 1) {
        systemStatus = "Raat, grid gayi — battery se chal raha hai";
      } else {
        systemOffline = true;
        systemStatus = "Raat, grid gayi, battery khali — system offline";
      }
    }
  } else if (pcuMode === "hybrid-pcu") {
    if (gridAvailable) {
      // Load: Grid → Solar → Battery — grid always covers the load, battery is reserved.
      const solarCharge = chargeFromSolar(Math.max(0, solarW));
      const gridTopUp = solarCharge < SPV_CHARGE_CAP_W
        ? chargeFromGrid(Math.min(GRID_CHARGE_CAP_W, SPV_CHARGE_CAP_W - solarCharge))
        : 0;
      gridImportW = rawLoadW + gridTopUp;
      netMeterWh -= gridImportW * TICK_HOURS;
      systemStatus = solarCharge + gridTopUp > 0
        ? "HYBRID: grid se load chal raha hai, battery solar (+ zaroorat par grid) se charge ho rahi hai"
        : "HYBRID: grid se load chal raha hai, battery full";
    } else {
      // Grid fail — falls back to Solar → Battery for load (no grid to rely on)
      if (surplus >= 0) {
        chargeFromSolar(surplus);
        systemStatus = "Bijli gayi — solar se load chal raha hai, battery charge bhi ho rahi hai";
      } else {
        const discharged = dischargeToward(deficit);
        if (discharged >= deficit - 1) {
          systemStatus = "Bijli gayi — solar + battery se load chal raha hai";
        } else {
          systemOffline = true;
          systemStatus = "Bijli gayi, battery khali — system offline";
        }
      }
    }
  } else if (pcuMode === "grid-export") {
    if (!netMeterInstalled) {
      // Defensive fallback — UI + store already guard against this, but keep the
      // simulation itself safe (behaves exactly like SMART).
      if (isDay) {
        runPcuChain();
      } else if (gridAvailable) {
        const charged = chargeFromGrid(GRID_CHARGE_CAP_W);
        gridImportW = rawLoadW + charged;
        netMeterWh -= gridImportW * TICK_HOURS;
        systemStatus = "Raat — grid se load + battery charge (net-meter nahi hai, GRID EXPORT band)";
      } else {
        const discharged = dischargeToward(rawLoadW);
        if (discharged >= rawLoadW - 1) {
          systemStatus = "Raat, grid gayi — battery se chal raha hai";
        } else {
          systemOffline = true;
          systemStatus = "Raat, grid gayi, battery khali — system offline";
        }
      }
    } else if (surplus >= 0) {
      const charged = chargeFromSolar(surplus);
      const leftover = surplus - charged;
      if (leftover > 1) {
        gridExportW = leftover;
        netMeterWh += leftover * TICK_HOURS;
        systemStatus = charged > 0
          ? "Battery charge ho rahi hai, extra solar grid ko export ho raha hai"
          : "Battery full — poora surplus solar grid ko export ho raha hai";
      } else {
        systemStatus = "Solar se battery charge ho rahi hai";
      }
    } else {
      const discharged = dischargeToward(deficit);
      const stillDeficit = deficit - discharged;
      if (stillDeficit > 1) {
        if (gridAvailable) {
          gridImportW = stillDeficit;
          netMeterWh -= stillDeficit * TICK_HOURS;
          systemStatus = "Solar kam — battery + grid se load chal raha hai";
        } else {
          systemOffline = true;
          systemStatus = "Solar kam, battery khali, grid bhi nahi — system offline";
        }
      } else {
        systemStatus = "Solar kam — battery se load chal raha hai";
      }
    }
  }

  // ── Status key override — overload band takes priority, then DoD floor ──
  let statusKey: LabelKey | undefined;
  const atDodFloor = !batteryEffectivelyOff && batterySoc <= lowCutoff + 0.01 && lowCutoff >= 0.5;
  if (!systemOffline) {
    if (overloadBand === "red") statusKey = "overloadRed";
    else if (overloadBand === "amber") statusKey = "overloadAmber";
    else if (atDodFloor) statusKey = "batteryDodFloor";
  }

  return {
    solarW,
    loadW: rawLoadW,
    gridImportW,
    gridExportW,
    batteryChargeW,
    batteryDischargeW,
    netMeterWh,
    systemStatus,
    systemOffline,
    surgeActive: false,
    batteryNewSoc,
    inverterOverload: false,
    overloadBand,
    statusKey,
  };
}
