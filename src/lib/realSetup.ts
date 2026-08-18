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
import { APPLIANCES } from "./appliances";

const TICK_HOURS = 1;

// ─── As-built hardware constants (03_ASBUILT.md §2) ─────────────────────────
export const REAL_SETUP_PANEL_KWP = 4.8;
export const REAL_SETUP_BATTERY_KWH = 7.2;
export const REAL_SETUP_BATTERY_TYPE: BatteryType = "lead-acid";
export const REAL_SETUP_DAY_TYPE: DayType = "clear";

/** Battery-mode continuous output cap (UGE5048 nameplate) — applies to all 4 PCU modes' AC output. */
export const PCU_CAP_W = 4000;
/** Transformer-based PCU — real-world efficiency, not the generic 0.95 used by Learn mode. */
export const PCU_EFF = 0.90;

/**
 * PVVNL sanctioned load per connection (03_ASBUILT.md §1 topology row + §2.2
 * "Simulator implication (e)" correction, owner question "grid hai to trip
 * kyu?" 2026-08-18). Distinct from PCU_CAP_W: this is a BILLING/METERING
 * limit, not an inverter hardware limit — drawing above it while on grid
 * risks a PVVNL penalty (real data point: Connection 1 hit 6.71 kW vs this
 * 4 kW sanction in Jun-2026, 03_ASBUILT §3), it never trips anything.
 */
export const SANCTIONED_LOAD_W = 4000;

/** SPV (solar) battery-charge current default + derived watt cap (18A × ~54V per manual). */
export const SPV_CHARGE_A_DEFAULT = 18;
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

// ─── Connection selector (03_ASBUILT.md §3.1 — owner-confirmed 2026-08-18) ──
/**
 * Per-connection default APPLIANCE QUANTITIES — real household split, not a
 * generic 50/50 halving. Source of truth: 03_ASBUILT.md §3.1 "Per-connection
 * appliance split (CONFIRMED by owner 2026-08-18 14:14 IST)".
 *
 * Connection 2 (Rajat's side — bedroom + kitchen + bathroom) gets an
 * EXPLICIT, small list: one AC/fridge/fan, the bedroom+bathroom+kitchen
 * lighting, the PC, ALL kitchen appliances, and the EV charger. Every other
 * catalog id is 0 on Connection 2 (not present on that connection at all).
 *
 * Connection 1 (Arun's side — "baki sab") is everything else: the FULL
 * catalog default quantity for every id NOT exclusively on Connection 2,
 * except the AC is downgraded from the catalog's qty=2 (both wall units) to
 * a single unit so the "2-AC rule" toast is discovered by the user bumping
 * the qty stepper, not pre-fired at boot. Kitchen appliances, EV, and PC are
 * hard-zeroed on Connection 1 — those are Connection-2-exclusive per §3.1.
 */
const CONNECTION_2_QTYS: Partial<Record<string, number>> = {
  ac: 1,
  fridge: 1,
  fan: 1,
  "light-strip": 4,
  tubelight: 2,
  light: 2,
  pc: 1,
  mixer: 1,
  microwave: 1,
  chimney: 1,
  toaster: 1,
  "air-fryer": 1,
  "water-bag": 1,
  ev: 1,
};

/** Connection-2-exclusive ids — hard-zeroed on Connection 1 (03_ASBUILT §3.1). */
const CONNECTION_1_ZERO_IDS = new Set([
  "mixer", "microwave", "chimney", "toaster", "air-fryer", "water-bag", "ev", "pc",
]);

function buildConnection1Qtys(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of APPLIANCES) {
    if (CONNECTION_1_ZERO_IDS.has(a.id)) {
      out[a.id] = 0;
    } else {
      out[a.id] = a.id === "ac" ? 1 : a.defaultQty ?? 1;
    }
  }
  return out;
}

function buildConnection2Qtys(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of APPLIANCES) out[a.id] = CONNECTION_2_QTYS[a.id] ?? 0;
  return out;
}

/** Default appliance QUANTITY per catalog id, per connection (0 = not on this connection). */
export const CONNECTION_APPLIANCE_QTYS: Record<ConnectionId, Record<string, number>> = {
  "connection-1": buildConnection1Qtys(),
  "connection-2": buildConnection2Qtys(),
};

const LIGHTING_IDS = ["light", "tubelight", "led-small", "led-large", "filament", "light-strip"];
/** Baseline candidate ids that boot ON when present (nonzero qty) on a connection. */
const BASELINE_ON_IDS = [...LIGHTING_IDS, "fan", "fridge", "ac"];

/**
 * Boot ON-state per connection: baseline lights/fan/fridge + AC ON, every
 * heavy load OFF — so the family-rule toasts (geyser/2-AC/EV, 03_ASBUILT §3
 * "Family rules") are DISCOVERED by the user toggling appliances, never
 * pre-fired at boot (03_ASBUILT §3.1 "Rules" paragraph).
 */
export const CONNECTION_BOOT_ON: Record<ConnectionId, string[]> = {
  "connection-1": BASELINE_ON_IDS.filter((id) => (CONNECTION_APPLIANCE_QTYS["connection-1"][id] ?? 0) > 0),
  "connection-2": BASELINE_ON_IDS.filter((id) => (CONNECTION_APPLIANCE_QTYS["connection-2"][id] ?? 0) > 0),
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
    /** 03_ASBUILT §2.2(e) — PVVNL billing limit, not a hardware cap; distinct from batteryModeCap. */
    sanctionedLoad: "4 kW (PVVNL)",
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
  /** LEAD-2 (code review): surplus solar wasted this tick (not served to load, charged, or exported). */
  curtailedW: number;
  /** R5 (code review): lead-acid bank sitting at/below its 50% DoD floor — surfaced as a TopBar alert too. */
  atDodFloor: boolean;
  /** 03_ASBUILT §2.2(e): grid ON + total load above SANCTIONED_LOAD_W — billing/penalty advisory, never a trip. */
  sanctionedLoadExceeded: boolean;
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

  // R6 (code review): PV DC output passes through the PCU's DC→AC inverter
  // stage before it can serve load / export to grid, so it takes the real
  // UGE5048 efficiency hit (~90%) here at the source. Battery charging from
  // solar in this mode goes through the same inverter-mediated charge path
  // (no separate high-efficiency DC-DC MPPT is modelled), so this single
  // multiplication is the ONLY place PCU_EFF is applied to solar — the
  // battery's own usable-kWh efficiency factor (below) is a distinct
  // round-trip loss, not a second application of this same loss.
  const rawSolarW = solarOn ? getSolarW(timeHour, dayType, panelKwp) : 0;
  const solarW = rawSolarW * PCU_EFF;
  const isDay = solarW > 0;
  const surplus = solarW - rawLoadW;
  const deficit = Math.max(0, -surplus);

  const batteryUsableKwh = getBatteryUsableKwh(batteryKwh, batteryType, PCU_EFF);
  const lowCutoff = LOW_SOC_CUTOFF[batteryType];
  const batteryEffectivelyOff = !batteryOn || batteryKwh <= 0;
  const activeSoc = batteryEffectivelyOff ? 0 : batterySoc;
  const maxRateW = getMaxBatteryRateW(batteryKwh, batteryType);

  // 03_ASBUILT §2.2(e) CORRECTION (owner question "grid hai to trip kyu?",
  // 2026-08-18): the 4kW cap + 60s/30s trip timers model the INVERTER's own
  // battery/solar->AC path — they apply ONLY when the inverter is the sole
  // source serving the load, i.e. grid OFF (or failed). With grid AVAILABLE,
  // any load beyond what solar+battery can carry through the inverter is
  // picked up directly by the grid (mains/grid-tie changeover) — every mode
  // branch below already routes an uncovered deficit into gridImportW
  // whenever gridAvailable is true, so the inverter itself is never actually
  // asked to carry more than its own cap; there is no trip to model there.
  // The manual's own Grid-Tie-ON overload table only starts at >200% of the
  // 5kVA mains rating (>=10kW, 10-MINUTE timer) — two orders of magnitude
  // above any default household combo in this simulator (max ~9.5kW with
  // every catalog appliance on for one connection) — so, per the correction's
  // own "or simply cap the sim at 'no trip below 10kW with grid ON' and
  // document" fallback, this simulator does not model a grid-tie trip at
  // all: overloadBand (and therefore all the countdown/trip machinery below,
  // AND OverloadWatcher.tsx's wall-clock countdown, which only ever fires on
  // a non-"none" band) is unconditionally "none" whenever grid is available.
  const overloadBand: OverloadBand = gridAvailable ? "none" : getOverloadBand(rawLoadW, PCU_CAP_W);
  const isTripped = pcuTripped || overloadBand === "critical";

  // NEW advisory (03_ASBUILT §2.2(e)) — PVVNL sanctioned load (billing limit,
  // not a hardware/trip limit) is exceeded while drawing from grid. Never
  // trips; surfaced as a Grid-node chip + ticker line, not systemStatus.
  const sanctionedLoadExceeded = gridAvailable && rawLoadW > SANCTIONED_LOAD_W;

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
      curtailedW: 0,
      atDodFloor: !batteryEffectivelyOff && batterySoc <= LOW_SOC_CUTOFF[batteryType] + 0.01 && LOW_SOC_CUTOFF[batteryType] >= 0.5,
      sanctionedLoadExceeded,
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
  // LEAD-2 (code review): surplus solar that is neither served to load, nor
  // charged into the battery, nor exported to grid — silently wasted unless
  // surfaced in the UI. Only set >0 in the surplus/day branches below.
  let curtailedW = 0;

  // R1 (code review): chargeFromSolar()/chargeFromGrid() must be ADDITIVE —
  // HYBRID mode calls both in the same tick (solar first, grid top-up
  // second) and the battery can only physically be charged once per tick.
  // socCursor is a running cursor so a second call sees the SoC delta the
  // first call already produced, and batteryChargeW accumulates instead of
  // being overwritten. The combined charge rate (solar + grid together) is
  // capped at min(SPV_CHARGE_CAP_W, maxRateW) — the PCU's single battery
  // charge circuit, not two independent ones.
  let socCursor = activeSoc;
  const combinedChargeCapW = Math.min(SPV_CHARGE_CAP_W, maxRateW);

  function chargeFromSolar(availableSolarSurplusW: number): number {
    if (batteryEffectivelyOff || socCursor >= 1.0) return 0;
    const roomW = Math.max(0, combinedChargeCapW - batteryChargeW);
    const chargeW = Math.min(availableSolarSurplusW, roomW);
    if (chargeW <= 0) return 0;
    batteryChargeW += chargeW;
    const deltaKwh = (chargeW * TICK_HOURS) / 1000;
    socCursor = clamp(socCursor + deltaKwh / batteryUsableKwh, 0, 1);
    if (socCursor >= 0.99) socCursor = 1.0;
    batteryNewSoc = socCursor;
    return chargeW;
  }

  function chargeFromGrid(capW: number): number {
    if (batteryEffectivelyOff || socCursor >= 1.0) return 0;
    const roomW = Math.max(0, combinedChargeCapW - batteryChargeW);
    const chargeW = Math.min(capW, roomW);
    if (chargeW <= 0) return 0;
    batteryChargeW += chargeW;
    const deltaKwh = (chargeW * TICK_HOURS) / 1000;
    socCursor = clamp(socCursor + deltaKwh / batteryUsableKwh, 0, 1);
    if (socCursor >= 0.99) socCursor = 1.0;
    batteryNewSoc = socCursor;
    return chargeW;
  }

  function dischargeToward(targetW: number): number {
    if (batteryEffectivelyOff || socCursor <= lowCutoff) return 0;
    const dischargeW = Math.min(targetW, maxRateW);
    if (dischargeW <= 0) return 0;
    batteryDischargeW = dischargeW;
    const deltaKwh = (dischargeW * TICK_HOURS) / 1000;
    socCursor = clamp(socCursor - deltaKwh / batteryUsableKwh, 0, 1);
    batteryNewSoc = socCursor;
    return dischargeW;
  }

  // ── PCU mode: Solar → Battery → Grid (always, no day/night switch) ──
  function runPcuChain() {
    if (surplus >= 0) {
      const charged = chargeFromSolar(surplus);
      curtailedW = Math.max(0, surplus - charged);
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
      // Solar never serves load in this branch (grid does) — anything solar
      // didn't put into the battery charge is wasted (LEAD-2).
      curtailedW = Math.max(0, solarW - solarCharge);
      gridImportW = rawLoadW + gridTopUp;
      netMeterWh -= gridImportW * TICK_HOURS;
      systemStatus = solarCharge + gridTopUp > 0
        ? "HYBRID: grid se load chal raha hai, battery solar (+ zaroorat par grid) se charge ho rahi hai"
        : "HYBRID: grid se load chal raha hai, battery full";
    } else {
      // Grid fail — falls back to Solar → Battery for load (no grid to rely on)
      if (surplus >= 0) {
        const charged = chargeFromSolar(surplus);
        curtailedW = Math.max(0, surplus - charged);
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
      // R2 (code review): the declared GRID EXPORT chain is
      // Solar → Grid → Battery (PCU_PRIORITY_CHAINS["grid-export"].load,
      // matches the sidebar chip / inverter text / 03_ASBUILT §2.2) — a
      // deficit must be topped up from grid FIRST, battery is the last
      // resort, not the first responder.
      if (gridAvailable) {
        gridImportW = deficit;
        netMeterWh -= deficit * TICK_HOURS;
        systemStatus = "Solar kam — grid se load chal raha hai (battery reserved, GRID EXPORT chain)";
      } else {
        const discharged = dischargeToward(deficit);
        if (discharged >= deficit - 1) {
          systemStatus = "Grid nahi — battery se load chal raha hai";
        } else {
          systemOffline = true;
          systemStatus = "Solar kam, grid nahi, battery bhi khali — system offline";
        }
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
    curtailedW,
    atDodFloor,
    sanctionedLoadExceeded,
  };
}
