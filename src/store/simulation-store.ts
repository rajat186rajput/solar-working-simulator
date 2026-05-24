"use client";

import { create } from "zustand";
import type { Mode, DayType, BatteryType, SimState } from "@/lib/types";
import { runSimulation } from "@/lib/simulation";
import { calcTotalLoad } from "@/lib/appliances";
import { getSolarW } from "@/lib/solar-curve";
import { DEFAULT_APPLIANCES_ON } from "@/lib/appliances";
import type { ScenarioPreset } from "@/lib/types";

interface SimStore extends SimState {
  // Actions
  setMode: (mode: Mode) => void;
  setTimeHour: (hour: number) => void;
  setDayType: (dayType: DayType) => void;
  setGridAvailable: (available: boolean) => void;
  toggleAppliance: (id: string) => void;
  setBatterySoc: (soc: number) => void;
  setBatteryKwh: (kwh: number) => void;
  setBatteryType: (type: BatteryType) => void;
  setPanelKwp: (kwp: number) => void;
  activateScenario: (scenario: ScenarioPreset) => void;
  resetToDefault: () => void;
  recompute: () => void;
}

function computeState(state: Partial<SimState>): Partial<SimState> {
  const mode = state.mode ?? "hybrid";
  const timeHour = state.timeHour ?? 14;
  const dayType = state.dayType ?? "clear";
  const gridAvailable = state.gridAvailable ?? true;
  const batterySoc = state.batterySoc ?? 0.80;
  const batteryKwh = state.batteryKwh ?? 5.12;
  const batteryType = state.batteryType ?? "lifepo4";
  const panelKwp = state.panelKwp ?? 4.4;
  const inverterWatts = state.inverterWatts ?? 6200;
  const appliancesOn = state.appliancesOn ?? DEFAULT_APPLIANCES_ON;
  const currentNetMeterWh = state.netMeterWh ?? 0;

  const loadW = calcTotalLoad(appliancesOn);

  const result = runSimulation({
    mode,
    timeHour,
    dayType,
    gridAvailable,
    batterySoc,
    batteryKwh,
    batteryType,
    panelKwp,
    inverterWatts,
    loadW,
    currentNetMeterWh,
  });

  // Append to status log
  const prevLog = (state.statusLog as string[]) ?? [];
  const newLog = [result.systemStatus, ...prevLog].slice(0, 4);

  return {
    solarW: result.solarW,
    loadW: result.loadW,
    gridImportW: result.gridImportW,
    gridExportW: result.gridExportW,
    batteryChargeW: result.batteryChargeW,
    batteryDischargeW: result.batteryDischargeW,
    netMeterWh: result.netMeterWh,
    systemStatus: result.systemStatus,
    systemOffline: result.systemOffline,
    surgeActive: result.surgeActive,
    inverterOverload: result.inverterOverload,
    batterySoc: result.batteryNewSoc,
    statusLog: newLog,
  };
}

const INITIAL_STATE: SimState = {
  mode: "hybrid",
  timeHour: 14,
  dayType: "clear",
  gridAvailable: true,
  batterySoc: 0.80,
  batteryKwh: 5.12,
  batteryType: "lifepo4",
  panelKwp: 4.4,
  inverterWatts: 6200,
  appliancesOn: [...DEFAULT_APPLIANCES_ON],

  solarW: getSolarW(14, "clear", 4.4),
  loadW: calcTotalLoad(DEFAULT_APPLIANCES_ON),
  gridImportW: 0,
  gridExportW: 0,
  batteryChargeW: 0,
  batteryDischargeW: 0,
  netMeterWh: 0,
  systemStatus: "Solar nearly covering full load.",
  systemOffline: false,
  surgeActive: false,
  inverterOverload: false,
  statusLog: ["Solar nearly covering full load."],
};

// Apply initial computation
const computed = computeState(INITIAL_STATE);
const BOOT_STATE: SimState = { ...INITIAL_STATE, ...computed };

export const useSimStore = create<SimStore>((set, get) => ({
  ...BOOT_STATE,

  recompute() {
    const state = get();
    const updates = computeState(state);
    set(updates as Partial<SimStore>);
  },

  setMode(mode) {
    set((s) => {
      const next = { ...s, mode };
      return { mode, ...computeState(next) } as Partial<SimStore>;
    });
  },

  setTimeHour(timeHour) {
    set((s) => {
      const next = { ...s, timeHour };
      return { timeHour, ...computeState(next) } as Partial<SimStore>;
    });
  },

  setDayType(dayType) {
    set((s) => {
      const next = { ...s, dayType };
      return { dayType, ...computeState(next) } as Partial<SimStore>;
    });
  },

  setGridAvailable(gridAvailable) {
    set((s) => {
      const next = { ...s, gridAvailable };
      return { gridAvailable, ...computeState(next) } as Partial<SimStore>;
    });
  },

  toggleAppliance(id) {
    set((s) => {
      const isOn = s.appliancesOn.includes(id);
      const appliancesOn = isOn
        ? s.appliancesOn.filter((a) => a !== id)
        : [...s.appliancesOn, id];
      const next = { ...s, appliancesOn };
      return { appliancesOn, ...computeState(next) } as Partial<SimStore>;
    });
  },

  setBatterySoc(batterySoc) {
    set((s) => {
      const next = { ...s, batterySoc };
      return { batterySoc, ...computeState(next) } as Partial<SimStore>;
    });
  },

  setBatteryKwh(batteryKwh) {
    set((s) => {
      const next = { ...s, batteryKwh };
      return { batteryKwh, ...computeState(next) } as Partial<SimStore>;
    });
  },

  setBatteryType(batteryType) {
    set((s) => {
      const next = { ...s, batteryType };
      return { batteryType, ...computeState(next) } as Partial<SimStore>;
    });
  },

  setPanelKwp(panelKwp) {
    set((s) => {
      const next = { ...s, panelKwp };
      return { panelKwp, ...computeState(next) } as Partial<SimStore>;
    });
  },

  activateScenario(scenario) {
    set((s) => {
      const next = {
        ...s,
        mode: s.mode, // keep current mode
        timeHour: scenario.timeHour,
        dayType: scenario.dayType,
        batterySoc: scenario.batterySoc,
        gridAvailable: scenario.gridAvailable,
        appliancesOn: [...scenario.appliancesOn],
        netMeterWh: 0,
      };
      return {
        timeHour: scenario.timeHour,
        dayType: scenario.dayType,
        batterySoc: scenario.batterySoc,
        gridAvailable: scenario.gridAvailable,
        appliancesOn: [...scenario.appliancesOn],
        netMeterWh: 0,
        ...computeState(next),
      } as Partial<SimStore>;
    });
  },

  resetToDefault() {
    set({ ...BOOT_STATE });
  },
}));
