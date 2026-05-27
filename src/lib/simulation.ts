import type { Mode, DayType, BatteryType, SimResult } from "./types";
import { getSolarW } from "./solar-curve";
import { clamp } from "./utils";

interface SimInput {
  mode: Mode;
  timeHour: number;
  dayType: DayType;
  gridAvailable: boolean;
  batterySoc: number;         // 0.0 to 1.0
  batteryKwh: number;         // rated kWh
  batteryType: BatteryType;
  batteryOn: boolean;         // master battery switch
  panelKwp: number;
  solarOn: boolean;           // master solar switch
  inverterWatts: number;
  loadW: number;
  currentNetMeterWh: number;
  surgeW?: number;            // if surge is active
}

// Battery constants
const DOD_FACTOR: Record<BatteryType, number> = {
  lifepo4: 0.90,
  "lead-acid": 0.50,
};
const INVERTER_EFF = 0.95;
const LOW_SOC_CUTOFF: Record<BatteryType, number> = {
  lifepo4: 0.10,
  "lead-acid": 0.50,
};
// C-rate for max charge
const C_RATE: Record<BatteryType, number> = {
  lifepo4: 0.5,
  "lead-acid": 0.2,
};
const VOLTAGE: Record<BatteryType, number> = {
  lifepo4: 51.2,
  "lead-acid": 48,
};

function getBatteryUsableKwh(batteryKwh: number, batteryType: BatteryType): number {
  return batteryKwh * DOD_FACTOR[batteryType] * INVERTER_EFF;
}

function getMaxChargeW(batteryKwh: number, batteryType: BatteryType): number {
  // Estimate Ah from kWh / voltage, then apply C-rate
  const voltage = VOLTAGE[batteryType];
  const ah = (batteryKwh * 1000) / voltage;
  return ah * C_RATE[batteryType] * voltage;
}

// Tick duration for SoC change calculation (1 hour = 3600s)
const TICK_HOURS = 1;

export function runSimulation(input: SimInput): SimResult {
  const {
    mode,
    timeHour,
    dayType,
    gridAvailable,
    batterySoc,
    batteryKwh,
    batteryType,
    batteryOn,
    panelKwp,
    solarOn,
    inverterWatts,
    loadW: rawLoadW,
    currentNetMeterWh,
    surgeW,
  } = input;

  const effectiveLoadW = surgeW ?? rawLoadW;
  // If solar master switch is OFF, generation = 0 regardless of time/day
  const solarW = solarOn ? getSolarW(timeHour, dayType, panelKwp) : 0;
  const surplus = solarW - effectiveLoadW;
  const deficit = Math.abs(surplus);

  const batteryUsableKwh = getBatteryUsableKwh(batteryKwh, batteryType);
  const maxChargeW = getMaxChargeW(batteryKwh, batteryType);
  const lowCutoff = LOW_SOC_CUTOFF[batteryType];

  // When battery master switch OFF or capacity is 0 (None): treat as fully disconnected
  // (SoC below low-cutoff so no discharge is possible, no charge accepted)
  const batteryEffectivelyOff = !batteryOn || batteryKwh <= 0;
  const effectiveBatterySoc = batteryEffectivelyOff ? 0 : batterySoc;
  // Override batterySoc for all calculations below
  const activeSoc = effectiveBatterySoc;

  // Check inverter overload
  const inverterOverload = effectiveLoadW > inverterWatts;

  let gridImportW = 0;
  let gridExportW = 0;
  let batteryChargeW = 0;
  let batteryDischargeW = 0;
  let netMeterWh = currentNetMeterWh;
  let systemStatus = "";
  let systemOffline = false;
  // batteryNewSoc starts from real batterySoc; activeSoc drives logic
  let batteryNewSoc = batterySoc;

  if (inverterOverload && mode !== "on-grid") {
    // Inverter trip — system overloaded
    return {
      solarW,
      loadW: rawLoadW,
      gridImportW: 0,
      gridExportW: 0,
      batteryChargeW: 0,
      batteryDischargeW: 0,
      netMeterWh,
      systemStatus: `Inverter overload! Load ${Math.round(effectiveLoadW)}W > ${Math.round(inverterWatts)}W rated. Kuch appliances band karo.`,
      systemOffline: true,
      surgeActive: !!surgeW,
      batteryNewSoc: batterySoc,
      inverterOverload: true,
    };
  }

  // ---- ON-GRID ----
  if (mode === "on-grid") {
    if (!gridAvailable) {
      // Anti-islanding: complete shutdown
      systemOffline = true;
      systemStatus = "Grid nahin — On-Grid system band ho gaya. Solar bhi band.";
      return {
        solarW: 0,
        loadW: rawLoadW,
        gridImportW: 0,
        gridExportW: 0,
        batteryChargeW: 0,
        batteryDischargeW: 0,
        netMeterWh,
        systemStatus,
        systemOffline,
        surgeActive: false,
        batteryNewSoc: batterySoc,
        inverterOverload: false,
      };
    }

    if (solarW === 0) {
      gridImportW = rawLoadW;
      netMeterWh -= rawLoadW * TICK_HOURS;
      systemStatus = "Raat hai, suraj nahin — UPPCL ki bijli chal rahi hai";
    } else if (surplus >= 0) {
      gridExportW = surplus;
      netMeterWh += surplus * TICK_HOURS;
      systemStatus = "Battery full! Surplus bijli grid ko di ja rahi hai";
    } else {
      gridImportW = deficit;
      netMeterWh -= deficit * TICK_HOURS;
      systemStatus = "Solar kam — thodi bijli UPPCL se le rahe hain";
    }
  }

  // ---- OFF-GRID ----
  else if (mode === "off-grid") {
    if (solarW === 0) {
      if (activeSoc > lowCutoff) {
        batteryDischargeW = rawLoadW;
        const deltaKwh = (rawLoadW * TICK_HOURS) / 1000;
        batteryNewSoc = clamp(batterySoc - deltaKwh / batteryUsableKwh, 0, 1);
        systemStatus = !batteryEffectivelyOff
          ? "Raat — battery se chal raha hai"
          : "Battery disconnected — system offline";
        if (batteryEffectivelyOff) { systemOffline = true; batteryDischargeW = 0; batteryNewSoc = batterySoc; }
      } else {
        systemOffline = true;
        systemStatus = !batteryEffectivelyOff
          ? "Battery khatam — system offline"
          : "Battery disconnected + no solar — system offline";
      }
    } else if (surplus >= 0) {
      if (!batteryEffectivelyOff && activeSoc < 1.0) {
        const chargeW = Math.min(surplus, maxChargeW);
        batteryChargeW = chargeW;
        const deltaKwh = (chargeW * TICK_HOURS) / 1000;
        batteryNewSoc = clamp(batterySoc + deltaKwh / batteryUsableKwh, 0, 1);
        if (batteryNewSoc >= 0.99) batteryNewSoc = 1.0;
        systemStatus = "Dhoop se bijli banti hai, battery charge ho rahi hai";
      } else {
        // Battery full or disconnected — panels clip
        systemStatus = !batteryEffectivelyOff
          ? "Battery full — panels throttle ho rahe hain, urja waste ho rahi hai"
          : "Battery disconnected — solar se direct load chal raha hai";
      }
    } else {
      // Deficit — battery discharge
      if (activeSoc > lowCutoff) {
        batteryDischargeW = deficit;
        const deltaKwh = (deficit * TICK_HOURS) / 1000;
        batteryNewSoc = clamp(batterySoc - deltaKwh / batteryUsableKwh, 0, 1);
        systemStatus = "Bijli gayi — battery se chal raha hai";
      } else {
        systemOffline = true;
        systemStatus = !batteryEffectivelyOff
          ? "Battery khatam — kam zaroori cheezein band ho gayi"
          : "Battery disconnected — partial solar only";
      }
    }
  }

  // ---- HYBRID ----
  else if (mode === "hybrid") {
    if (gridAvailable) {
      if (solarW === 0) {
        if (!batteryEffectivelyOff && activeSoc < 1.0) {
          // Grid always charges battery when grid is available and battery not full
          const chargeW = maxChargeW;
          batteryChargeW = chargeW;
          const deltaKwh = (chargeW * TICK_HOURS) / 1000;
          batteryNewSoc = clamp(batterySoc + deltaKwh / batteryUsableKwh, 0, 1);
          if (batteryNewSoc >= 0.99) batteryNewSoc = 1.0;
          gridImportW = rawLoadW + chargeW;
          netMeterWh -= gridImportW * TICK_HOURS;
          systemStatus = "Raat — grid se battery charge ho rahi hai";
        } else {
          gridImportW = rawLoadW;
          netMeterWh -= rawLoadW * TICK_HOURS;
          systemStatus = "Raat hai, suraj nahin — UPPCL ki bijli chal rahi hai";
        }
      } else if (surplus >= 0) {
        if (!batteryEffectivelyOff && activeSoc < 1.0) {
          const solarSurplusW = surplus;
          // Grid tops up what solar surplus doesn't cover up to maxChargeW
          const gridChargeTopUpW = Math.max(0, maxChargeW - solarSurplusW);
          const totalChargeW = Math.min(maxChargeW, solarSurplusW + gridChargeTopUpW);
          batteryChargeW = totalChargeW;
          const deltaKwh = (totalChargeW * TICK_HOURS) / 1000;
          batteryNewSoc = clamp(batterySoc + deltaKwh / batteryUsableKwh, 0, 1);
          if (batteryNewSoc >= 0.99) batteryNewSoc = 1.0;
          if (gridChargeTopUpW > 0) {
            gridImportW = gridChargeTopUpW;
            netMeterWh -= gridChargeTopUpW * TICK_HOURS;
            systemStatus = "Solar + grid dono se battery fast charge ho rahi hai";
          } else {
            systemStatus = "Dhoop se bijli banti hai, battery charge ho rahi hai";
          }
        } else {
          // Battery full or disconnected — export to grid
          gridExportW = surplus;
          netMeterWh += surplus * TICK_HOURS;
          systemStatus = !batteryEffectivelyOff
            ? "Battery full! Surplus bijli grid ko di ja rahi hai"
            : "Battery disconnected — surplus solar grid ko ja rahi hai";
        }
      } else {
        // Deficit — grid covers load deficit AND charges battery (always-on grid charging)
        if (!batteryEffectivelyOff && activeSoc < 1.0) {
          const chargeW = maxChargeW;
          batteryChargeW = chargeW;
          const deltaKwh = (chargeW * TICK_HOURS) / 1000;
          batteryNewSoc = clamp(batterySoc + deltaKwh / batteryUsableKwh, 0, 1);
          if (batteryNewSoc >= 0.99) batteryNewSoc = 1.0;
          gridImportW = deficit + chargeW;
          netMeterWh -= gridImportW * TICK_HOURS;
          systemStatus = "Solar kam — grid load + battery dono charge kar raha hai";
        } else {
          gridImportW = deficit;
          netMeterWh -= deficit * TICK_HOURS;
          systemStatus = !batteryEffectivelyOff
            ? "Solar kam — thodi bijli UPPCL se le rahe hain (battery full hai)"
            : "Solar kam — UPPCL se le rahe hain (battery disconnected)";
        }
      }
    } else {
      // Grid fails — hybrid operates like off-grid
      if (solarW === 0) {
        if (activeSoc > lowCutoff) {
          batteryDischargeW = rawLoadW;
          const deltaKwh = (rawLoadW * TICK_HOURS) / 1000;
          batteryNewSoc = clamp(batterySoc - deltaKwh / batteryUsableKwh, 0, 1);
          systemStatus = "Bijli gayi, raat — sirf battery se chal raha hai";
        } else {
          systemOffline = true;
          systemStatus = !batteryEffectivelyOff
            ? "Battery khatam — system offline"
            : "Battery disconnected + grid fail — system offline";
        }
      } else if (surplus >= 0) {
        if (!batteryEffectivelyOff && activeSoc < 1.0) {
          const chargeW = Math.min(surplus, maxChargeW);
          batteryChargeW = chargeW;
          const deltaKwh = (chargeW * TICK_HOURS) / 1000;
          batteryNewSoc = clamp(batterySoc + deltaKwh / batteryUsableKwh, 0, 1);
          if (batteryNewSoc >= 0.99) batteryNewSoc = 1.0;
          systemStatus = "Bijli gayi, sunny — solar load chal raha hai + battery charge";
        } else {
          systemStatus = !batteryEffectivelyOff
            ? "Bijli gayi, sunny — solar load chal raha hai, battery 100%"
            : "Bijli gayi, sunny — solar se direct chal raha hai (battery disconnected)";
        }
      } else {
        if (activeSoc > lowCutoff) {
          batteryDischargeW = deficit;
          const deltaKwh = (deficit * TICK_HOURS) / 1000;
          batteryNewSoc = clamp(batterySoc - deltaKwh / batteryUsableKwh, 0, 1);
          systemStatus = "Bijli gayi — solar + battery se chal raha hai";
        } else {
          systemOffline = true;
          systemStatus = !batteryEffectivelyOff
            ? "Bijli gayi + battery khatam — sirf zaroori load chal raha hai"
            : "Bijli gayi + battery disconnected — system offline";
        }
      }
    }
  }

  // Battery SoC status override messages
  if (!systemOffline) {
    const currentSoc = batteryNewSoc;
    if (!batteryEffectivelyOff && (mode === "off-grid" || mode === "hybrid") && currentSoc <= 0.20 && currentSoc > 0.10) {
      systemStatus += " | Battery khatam hone wali hai — kuch appliances band karo";
    }
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
    surgeActive: !!surgeW,
    batteryNewSoc,
    inverterOverload,
  };
}

export function calcBackupHours(
  batterySoc: number,
  batteryKwh: number,
  batteryType: BatteryType,
  loadW: number
): number {
  const usable = getBatteryUsableKwh(batteryKwh, batteryType);
  const available = usable * batterySoc;
  if (loadW <= 0) return 99;
  return available / (loadW / 1000);
}
