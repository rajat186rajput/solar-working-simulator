"use client";

import { create } from "zustand";
import type { Mode, DayType, BatteryType, SimState } from "@/lib/types";
import { runSimulation } from "@/lib/simulation";
import { calcTotalLoadQty } from "@/lib/appliances";
import { getSolarW } from "@/lib/solar-curve";
import { DEFAULT_APPLIANCES_ON, DEFAULT_APPLIANCE_QTYS } from "@/lib/appliances";
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
  toggleBattery: () => void;
  setPanelKwp: (kwp: number) => void;
  toggleSolar: () => void;
  setApplianceQty: (id: string, qty: number) => void;
  toggleGridOnly: (id: string) => void;
  activateScenario: (scenario: ScenarioPreset) => void;
  resetToDefault: () => void;
  recompute: () => void;
  // SoC lock
  socLocked: boolean;
  setSocLocked: (v: boolean) => void;
}

function computeState(state: Partial<SimState> & { socLocked?: boolean }): Partial<SimState> {
  const mode = state.mode ?? "hybrid";
  const timeHour = state.timeHour ?? 14;
  const dayType = state.dayType ?? "clear";
  const gridAvailable = state.gridAvailable ?? true;
  const batterySoc = state.batterySoc ?? 0.80;
  const batteryKwh = state.batteryKwh ?? 5.12;
  const batteryType = state.batteryType ?? "lifepo4";
  const batteryOn = state.batteryOn ?? true;
  const panelKwp = state.panelKwp ?? 4.4;
  const solarOn = state.solarOn ?? true;
  const inverterWatts = state.inverterWatts ?? 6200;
  const applianceQtys = state.applianceQtys ?? DEFAULT_APPLIANCE_QTYS;
  const gridOnlyAppliances = state.gridOnlyAppliances ?? new Set<string>();
  const currentNetMeterWh = state.netMeterWh ?? 0;
  const socLocked = state.socLocked ?? true;

  const loadW = calcTotalLoadQty(applianceQtys, gridAvailable, gridOnlyAppliances);

  const result = runSimulation({
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
    loadW,
    currentNetMeterWh,
  });

  // Derive legacy appliancesOn for scenario/schematic compat
  const appliancesOn = applianceQtys.filter((e) => e.isOn).map((e) => e.id);

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
    // When SoC is locked, preserve the user-set batterySoc; otherwise let simulation drive it
    batterySoc: socLocked ? batterySoc : result.batteryNewSoc,
    appliancesOn,
    statusLog: newLog,
  };
}

const INITIAL_STATE: SimState & { socLocked: boolean } = {
  mode: "hybrid",
  timeHour: 14,
  dayType: "clear",
  gridAvailable: true,
  batterySoc: 0.80,
  batteryKwh: 5.12,
  batteryType: "lifepo4",
  batteryOn: true,
  panelKwp: 4.4,
  solarOn: true,
  inverterWatts: 6200,
  appliancesOn: [...DEFAULT_APPLIANCES_ON],
  applianceQtys: DEFAULT_APPLIANCE_QTYS.map((e) => ({ ...e })),
  gridOnlyAppliances: new Set<string>(),
  socLocked: true,

  solarW: getSolarW(14, "clear", 4.4),
  loadW: calcTotalLoadQty(DEFAULT_APPLIANCE_QTYS),
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
const BOOT_STATE: SimState & { socLocked: boolean } = { ...INITIAL_STATE, ...computed };

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
      const qtys = s.applianceQtys.map((e) =>
        e.id === id ? { ...e, isOn: !e.isOn } : e
      );
      const next = { ...s, applianceQtys: qtys };
      return { applianceQtys: qtys, ...computeState(next) } as Partial<SimStore>;
    });
  },

  setApplianceQty(id, qty) {
    set((s) => {
      const clamped = Math.max(0, Math.min(10, qty));
      const qtys = s.applianceQtys.map((e) =>
        e.id === id ? { ...e, qty: clamped } : e
      );
      const next = { ...s, applianceQtys: qtys };
      return { applianceQtys: qtys, ...computeState(next) } as Partial<SimStore>;
    });
  },

  toggleGridOnly(id) {
    set((s) => {
      const next = new Set(s.gridOnlyAppliances);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      const nextState = { ...s, gridOnlyAppliances: next };
      return { gridOnlyAppliances: next, ...computeState(nextState) } as Partial<SimStore>;
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

  toggleBattery() {
    set((s) => {
      const batteryOn = !s.batteryOn;
      const next = { ...s, batteryOn };
      return { batteryOn, ...computeState(next) } as Partial<SimStore>;
    });
  },

  setPanelKwp(panelKwp) {
    set((s) => {
      const next = { ...s, panelKwp };
      return { panelKwp, ...computeState(next) } as Partial<SimStore>;
    });
  },

  toggleSolar() {
    set((s) => {
      const solarOn = !s.solarOn;
      const next = { ...s, solarOn };
      return { solarOn, ...computeState(next) } as Partial<SimStore>;
    });
  },

  activateScenario(scenario) {
    set((s) => {
      // Map scenario appliancesOn into qtys (keep existing qtys, just flip isOn)
      const qtys = s.applianceQtys.map((e) => ({
        ...e,
        isOn: scenario.appliancesOn.includes(e.id),
      }));
      const next = {
        ...s,
        mode: s.mode,
        timeHour: scenario.timeHour,
        dayType: scenario.dayType,
        batterySoc: scenario.batterySoc,
        gridAvailable: scenario.gridAvailable,
        applianceQtys: qtys,
        netMeterWh: 0,
      };
      return {
        timeHour: scenario.timeHour,
        dayType: scenario.dayType,
        batterySoc: scenario.batterySoc,
        gridAvailable: scenario.gridAvailable,
        applianceQtys: qtys,
        netMeterWh: 0,
        ...computeState(next),
      } as Partial<SimStore>;
    });
  },

  resetToDefault() {
    set({ ...BOOT_STATE });
  },

  setSocLocked(v: boolean) {
    set((s) => {
      const next = { ...s, socLocked: v };
      return { socLocked: v, ...computeState(next) } as Partial<SimStore>;
    });
  },
}));
