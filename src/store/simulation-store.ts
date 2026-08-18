"use client";

import { create } from "zustand";
import type {
  Mode,
  DayType,
  BatteryType,
  SimState,
  ConnectionId,
  PcuMode,
  OverloadBand,
  ApplianceQtyEntry,
} from "@/lib/types";
import { runSimulation } from "@/lib/simulation";
import { calcTotalLoadQty } from "@/lib/appliances";
import { getSolarW } from "@/lib/solar-curve";
import { DEFAULT_APPLIANCES_ON, DEFAULT_APPLIANCE_QTYS } from "@/lib/appliances";
import type { ScenarioPreset } from "@/lib/types";
import { L } from "@/lib/i18n";
import {
  runPcuSimulation,
  otherConnection,
  CONNECTION_DEFAULT_APPLIANCES,
  CONNECTION_DEFAULT_BATTERY_SOC,
  REAL_SETUP_PANEL_KWP,
  REAL_SETUP_BATTERY_KWH,
  REAL_SETUP_BATTERY_TYPE,
  PCU_CAP_W,
} from "@/lib/realSetup";

// ─── Real Setup snapshot shapes (Developer Handoff Checklist item 1) ───────
// A "learn snapshot" captures the generic-architecture side of the shared
// simulation fields so switching to Real Setup and back never regresses
// Learn mode. A "real-setup snapshot" is the mirror for the other direction.
interface ArchSnapshot {
  mode: Mode;
  panelKwp: number;
  batteryKwh: number;
  batteryType: BatteryType;
  batteryOn: boolean;
  solarOn: boolean;
  inverterWatts: number;
  applianceQtys: ApplianceQtyEntry[];
  gridOnlyAppliances: Set<string>;
  batterySoc: number;
  gridAvailable: boolean;
  netMeterWh: number;
  socLocked: boolean;
}
interface RealSetupSnapshot extends ArchSnapshot {
  activeConnection: ConnectionId;
  pcuMode: PcuMode;
  netMeterInstalled: boolean;
  connectionSnapshots: Record<ConnectionId, ConnectionSnapshot>;
}
interface ConnectionSnapshot {
  applianceQtys: ApplianceQtyEntry[];
  batterySoc: number;
}

function connectionDefault(id: ConnectionId): ConnectionSnapshot {
  return {
    // Real Setup defaults to a single AC unit ON per connection — the
    // catalog's qty=2 default (both wall units) is left for the user to
    // discover deliberately, which is what triggers the F.2 2-AC rule toast
    // (03_ASBUILT.md §3 family rule 3) instead of firing it at boot.
    applianceQtys: DEFAULT_APPLIANCE_QTYS.map((e) => ({
      ...e,
      qty: e.id === "ac" ? 1 : e.qty,
      isOn: CONNECTION_DEFAULT_APPLIANCES[id].includes(e.id),
    })),
    batterySoc: CONNECTION_DEFAULT_BATTERY_SOC[id],
  };
}

function defaultConnectionSnapshots(): Record<ConnectionId, ConnectionSnapshot> {
  return {
    "connection-1": connectionDefault("connection-1"),
    "connection-2": connectionDefault("connection-2"),
  };
}

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
  setInverterWatts: (watts: number) => void;
  setApplianceQty: (id: string, qty: number) => void;
  toggleGridOnly: (id: string) => void;
  activateScenario: (scenario: ScenarioPreset) => void;
  resetToDefault: () => void;
  recompute: () => void;
  // SoC lock
  socLocked: boolean;
  setSocLocked: (v: boolean) => void;
  // Ghar appliance drawer
  gharDrawerOpen: boolean;
  gharDrawerPinned: boolean;
  setGharDrawerOpen: (v: boolean) => void;
  setGharDrawerPinned: (v: boolean) => void;
  // Language toggle
  lang: "en" | "hi";
  setLang: (l: "en" | "hi") => void;

  // ── Real Setup — House No. 89 (simView is a PEER of Mode, not a replacement) ──
  simView: "learn" | "real-setup";
  setSimView: (view: "learn" | "real-setup") => void;
  activeConnection: ConnectionId;
  setActiveConnection: (id: ConnectionId) => void;
  pcuMode: PcuMode;
  setPcuMode: (mode: PcuMode) => void;
  netMeterInstalled: boolean;
  setNetMeterInstalled: (v: boolean) => void;
  pcuTripped: boolean;
  setPcuTripped: (v: boolean) => void;
  overloadBand: OverloadBand;
  overloadRemainingSec: number | null;
  setOverloadRemainingSec: (v: number | null) => void;
  connectionSnapshots: Record<ConnectionId, ConnectionSnapshot>;
  otherConnectionSummary: { loadW: number; batterySoc: number };
  learnSnapshot: ArchSnapshot | null;
  realSetupSnapshot: RealSetupSnapshot | null;
  /** LEAD-2 (code review): surplus solar wasted this tick — 0 in Learn mode (not modelled there). */
  curtailedW: number;
  /** R5 (code review): lead-acid bank at/below its 50% DoD floor — false in Learn mode. */
  batteryAtDodFloor: boolean;
  /** Generic status-log append (used by RealSetupToast for the F.2 rule toasts). */
  appendStatusLog: (msg: string) => void;
}

// ─── R4 (code review): shared as-built default block ────────────────────────
// Used both on first-ever entry into Real Setup (setSimView) AND on Reset
// while already in Real Setup (resetToDefault) — factored out so Reset no
// longer force-switches the user back to Learn mode / wipes state to the
// Learn-mode BOOT_STATE.
function realSetupFirstEntryDefaults(): Partial<SimStore> {
  const conn: ConnectionId = "connection-1";
  const snapshots = defaultConnectionSnapshots();
  return {
    panelKwp: REAL_SETUP_PANEL_KWP,
    batteryKwh: REAL_SETUP_BATTERY_KWH,
    batteryType: REAL_SETUP_BATTERY_TYPE,
    batteryOn: true,
    solarOn: true,
    inverterWatts: PCU_CAP_W,
    applianceQtys: snapshots[conn].applianceQtys.map((e) => ({ ...e })),
    gridOnlyAppliances: new Set<string>(),
    batterySoc: snapshots[conn].batterySoc,
    gridAvailable: true,
    dayType: "clear",
    netMeterWh: 0,
    socLocked: true,
    activeConnection: conn,
    pcuMode: "smart",
    netMeterInstalled: false,
    connectionSnapshots: snapshots,
    pcuTripped: false,
    overloadRemainingSec: null,
  };
}

function computeState(state: Partial<SimStore>): Partial<SimStore> {
  const simView = state.simView ?? "learn";
  const lang = state.lang ?? "en";
  const applianceQtys = state.applianceQtys ?? DEFAULT_APPLIANCE_QTYS;
  const gridOnlyAppliances = state.gridOnlyAppliances ?? new Set<string>();
  const gridAvailable = state.gridAvailable ?? true;
  const socLocked = state.socLocked ?? true;
  const loadW = calcTotalLoadQty(applianceQtys, gridAvailable, gridOnlyAppliances);
  const appliancesOn = applianceQtys.filter((e) => e.isOn).map((e) => e.id);
  const prevLog = (state.statusLog as string[]) ?? [];

  // ── Real Setup — House No. 89 branch (separate engine, lib/realSetup.ts) ──
  if (simView === "real-setup") {
    const timeHour = state.timeHour ?? 14;
    const dayType = state.dayType ?? "clear";
    const batterySoc = state.batterySoc ?? CONNECTION_DEFAULT_BATTERY_SOC["connection-1"];
    const batteryKwh = state.batteryKwh ?? REAL_SETUP_BATTERY_KWH;
    const batteryType = state.batteryType ?? REAL_SETUP_BATTERY_TYPE;
    const batteryOn = state.batteryOn ?? true;
    const panelKwp = state.panelKwp ?? REAL_SETUP_PANEL_KWP;
    const solarOn = state.solarOn ?? true;
    const currentNetMeterWh = state.netMeterWh ?? 0;
    const pcuMode = state.pcuMode ?? "smart";
    const netMeterInstalled = state.netMeterInstalled ?? false;
    const pcuTripped = state.pcuTripped ?? false;
    const activeConnection = state.activeConnection ?? "connection-1";
    const connectionSnapshots = state.connectionSnapshots ?? defaultConnectionSnapshots();

    const result = runPcuSimulation({
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
      loadW,
      currentNetMeterWh,
      pcuTripped,
    });

    const displayStatus = result.statusKey ? L(lang, result.statusKey) : result.systemStatus;
    const newLog = [displayStatus, ...prevLog].slice(0, 4);

    const otherId = otherConnection(activeConnection);
    const otherSnap = connectionSnapshots[otherId];
    const otherConnectionSummary = otherSnap
      ? { loadW: calcTotalLoadQty(otherSnap.applianceQtys), batterySoc: otherSnap.batterySoc }
      : { loadW: 0, batterySoc: 0 };

    return {
      solarW: result.solarW,
      loadW: result.loadW,
      gridImportW: result.gridImportW,
      gridExportW: result.gridExportW,
      batteryChargeW: result.batteryChargeW,
      batteryDischargeW: result.batteryDischargeW,
      netMeterWh: result.netMeterWh,
      systemStatus: displayStatus,
      systemOffline: result.systemOffline,
      surgeActive: result.surgeActive,
      inverterOverload: result.inverterOverload,
      overloadBand: result.overloadBand,
      batterySoc: socLocked ? batterySoc : result.batteryNewSoc,
      appliancesOn,
      statusLog: newLog,
      otherConnectionSummary,
      curtailedW: result.curtailedW,
      batteryAtDodFloor: result.atDodFloor,
    };
  }

  // ── Learn mode (existing generic on-grid/off-grid/hybrid engine — UNCHANGED) ──
  const mode = state.mode ?? "hybrid";
  const timeHour = state.timeHour ?? 14;
  const dayType = state.dayType ?? "clear";
  const batterySoc = state.batterySoc ?? 0.80;
  const batteryKwh = state.batteryKwh ?? 5;
  const batteryType = state.batteryType ?? "lifepo4";
  const batteryOn = state.batteryOn ?? true;
  const panelKwp = state.panelKwp ?? 5;
  const solarOn = state.solarOn ?? true;
  const inverterWatts = state.inverterWatts ?? 6200;
  const currentNetMeterWh = state.netMeterWh ?? 0;

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
    overloadBand: "none",
    // When SoC is locked, preserve the user-set batterySoc; otherwise let simulation drive it
    batterySoc: socLocked ? batterySoc : result.batteryNewSoc,
    appliancesOn,
    statusLog: newLog,
    // Real-Setup-only concepts — explicitly zeroed so a leftover value from a
    // prior real-setup tick doesn't linger after switching back to Learn.
    curtailedW: 0,
    batteryAtDodFloor: false,
  };
}

const INITIAL_STATE: SimState & {
  socLocked: boolean;
  gharDrawerOpen: boolean;
  gharDrawerPinned: boolean;
  lang: "en" | "hi";
  simView: "learn" | "real-setup";
  activeConnection: ConnectionId;
  pcuMode: PcuMode;
  netMeterInstalled: boolean;
  pcuTripped: boolean;
  overloadBand: OverloadBand;
  overloadRemainingSec: number | null;
  connectionSnapshots: Record<ConnectionId, ConnectionSnapshot>;
  otherConnectionSummary: { loadW: number; batterySoc: number };
  learnSnapshot: ArchSnapshot | null;
  realSetupSnapshot: RealSetupSnapshot | null;
  curtailedW: number;
  batteryAtDodFloor: boolean;
} = {
  mode: "hybrid",
  timeHour: 14,
  dayType: "clear",
  gridAvailable: true,
  batterySoc: 0.80,
  batteryKwh: 5,
  batteryType: "lifepo4",
  batteryOn: true,
  panelKwp: 5,
  solarOn: true,
  inverterWatts: 6200,
  appliancesOn: [...DEFAULT_APPLIANCES_ON],
  applianceQtys: DEFAULT_APPLIANCE_QTYS.map((e) => ({ ...e })),
  gridOnlyAppliances: new Set<string>(),
  socLocked: true,
  gharDrawerOpen: true,
  gharDrawerPinned: true,
  lang: "en",

  simView: "learn",
  activeConnection: "connection-1",
  pcuMode: "smart",
  netMeterInstalled: false,
  pcuTripped: false,
  overloadBand: "none",
  overloadRemainingSec: null,
  connectionSnapshots: defaultConnectionSnapshots(),
  otherConnectionSummary: { loadW: 0, batterySoc: 0 },
  learnSnapshot: null,
  realSetupSnapshot: null,
  curtailedW: 0,
  batteryAtDodFloor: false,

  solarW: getSolarW(14, "clear", 5),
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
const BOOT_STATE = { ...INITIAL_STATE, ...computed } as typeof INITIAL_STATE;

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

  setInverterWatts(inverterWatts) {
    set((s) => {
      const next = { ...s, inverterWatts };
      return { inverterWatts, ...computeState(next) } as Partial<SimStore>;
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
    set((s) => {
      // R4 (code review): resetToDefault() used to unconditionally spread
      // BOOT_STATE, which is Learn-mode state — that force-switched the user
      // to Learn and wiped both the learn/real-setup snapshots even when they
      // pressed Reset while already inside Real Setup. If we're in Real
      // Setup, stay there and re-apply the as-built defaults instead.
      if (s.simView === "real-setup") {
        const next = realSetupFirstEntryDefaults();
        const merged = { ...s, ...next, simView: "real-setup" as const };
        return {
          ...next,
          simView: "real-setup",
          // Stale pre-reset snapshot would otherwise resurrect old state the
          // next time the user switches Learn → Real Setup.
          realSetupSnapshot: null,
          ...computeState(merged),
        } as Partial<SimStore>;
      }
      return { ...BOOT_STATE };
    });
  },

  setSocLocked(v: boolean) {
    set((s) => {
      const next = { ...s, socLocked: v };
      return { socLocked: v, ...computeState(next) } as Partial<SimStore>;
    });
  },

  setGharDrawerOpen(v: boolean) {
    set({ gharDrawerOpen: v });
  },

  setGharDrawerPinned(v: boolean) {
    set({ gharDrawerPinned: v });
  },

  setLang(lang: "en" | "hi") {
    // R13 (code review): systemStatus is resolved from statusKey via L(lang, key)
    // at compute time and cached as a plain string — switching lang without a
    // recompute left it showing the old language until the next tick.
    set((s) => {
      const next = { ...s, lang };
      return { lang, ...computeState(next) } as Partial<SimStore>;
    });
  },

  // ── Real Setup actions ──────────────────────────────────────────────────

  setSimView(view) {
    set((s) => {
      if (view === s.simView) return {};

      if (view === "real-setup") {
        const learnSnapshot: ArchSnapshot = {
          mode: s.mode,
          panelKwp: s.panelKwp,
          batteryKwh: s.batteryKwh,
          batteryType: s.batteryType,
          batteryOn: s.batteryOn,
          solarOn: s.solarOn,
          inverterWatts: s.inverterWatts,
          applianceQtys: s.applianceQtys.map((e) => ({ ...e })),
          gridOnlyAppliances: new Set(s.gridOnlyAppliances),
          batterySoc: s.batterySoc,
          gridAvailable: s.gridAvailable,
          netMeterWh: s.netMeterWh,
          socLocked: s.socLocked,
        };

        let next: Partial<SimStore>;
        if (s.realSetupSnapshot) {
          const rs = s.realSetupSnapshot;
          next = {
            panelKwp: rs.panelKwp,
            batteryKwh: rs.batteryKwh,
            batteryType: rs.batteryType,
            batteryOn: rs.batteryOn,
            solarOn: rs.solarOn,
            inverterWatts: rs.inverterWatts,
            applianceQtys: rs.applianceQtys.map((e) => ({ ...e })),
            gridOnlyAppliances: new Set(rs.gridOnlyAppliances),
            batterySoc: rs.batterySoc,
            gridAvailable: rs.gridAvailable,
            netMeterWh: rs.netMeterWh,
            socLocked: rs.socLocked,
            activeConnection: rs.activeConnection,
            pcuMode: rs.pcuMode,
            netMeterInstalled: rs.netMeterInstalled,
            connectionSnapshots: rs.connectionSnapshots,
            pcuTripped: false,
            overloadRemainingSec: null,
          };
        } else {
          // First-ever visit to Real Setup — apply the as-built defaults
          // (03_ASBUILT.md §4.1): 4.8 kWp, UGE5048, 7.2 kWh lead-acid @ 50% DoD,
          // SMART mode default, net-meter OFF, grid ON, Bijnor clear day.
          next = realSetupFirstEntryDefaults();
        }

        const merged = { ...s, ...next, simView: "real-setup" as const };
        return {
          ...next,
          simView: "real-setup",
          learnSnapshot,
          ...computeState(merged),
        } as Partial<SimStore>;
      }

      // Switching back to Learn
      const realSetupSnapshot: RealSetupSnapshot = {
        mode: s.mode,
        panelKwp: s.panelKwp,
        batteryKwh: s.batteryKwh,
        batteryType: s.batteryType,
        batteryOn: s.batteryOn,
        solarOn: s.solarOn,
        inverterWatts: s.inverterWatts,
        applianceQtys: s.applianceQtys.map((e) => ({ ...e })),
        gridOnlyAppliances: new Set(s.gridOnlyAppliances),
        batterySoc: s.batterySoc,
        gridAvailable: s.gridAvailable,
        netMeterWh: s.netMeterWh,
        socLocked: s.socLocked,
        activeConnection: s.activeConnection,
        pcuMode: s.pcuMode,
        netMeterInstalled: s.netMeterInstalled,
        connectionSnapshots: s.connectionSnapshots,
      };

      const ln = s.learnSnapshot;
      const next: Partial<SimStore> = ln
        ? {
            mode: ln.mode,
            panelKwp: ln.panelKwp,
            batteryKwh: ln.batteryKwh,
            batteryType: ln.batteryType,
            batteryOn: ln.batteryOn,
            solarOn: ln.solarOn,
            inverterWatts: ln.inverterWatts,
            applianceQtys: ln.applianceQtys.map((e) => ({ ...e })),
            gridOnlyAppliances: new Set(ln.gridOnlyAppliances),
            batterySoc: ln.batterySoc,
            gridAvailable: ln.gridAvailable,
            netMeterWh: ln.netMeterWh,
            socLocked: ln.socLocked,
          }
        : {};

      const merged = { ...s, ...next, simView: "learn" as const };
      return {
        ...next,
        simView: "learn",
        realSetupSnapshot,
        pcuTripped: false,
        overloadRemainingSec: null,
        ...computeState(merged),
      } as Partial<SimStore>;
    });
  },

  setActiveConnection(id) {
    set((s) => {
      if (id === s.activeConnection) return {};
      const stashed: Record<ConnectionId, ConnectionSnapshot> = {
        ...s.connectionSnapshots,
        [s.activeConnection]: {
          applianceQtys: s.applianceQtys.map((e) => ({ ...e })),
          batterySoc: s.batterySoc,
        },
      };
      const incoming = stashed[id] ?? connectionDefault(id);
      const next = {
        activeConnection: id,
        applianceQtys: incoming.applianceQtys.map((e) => ({ ...e })),
        batterySoc: incoming.batterySoc,
        connectionSnapshots: stashed,
        netMeterWh: 0,
        pcuTripped: false,
        overloadRemainingSec: null,
      };
      const merged = { ...s, ...next };
      return { ...next, ...computeState(merged) } as Partial<SimStore>;
    });
  },

  setPcuMode(mode) {
    set((s) => {
      // GRID EXPORT is gated behind netMeterInstalled — the chip is disabled
      // in the UI too, this is the belt-and-braces store-level guard.
      if (mode === "grid-export" && !s.netMeterInstalled) return {};
      const next = { pcuMode: mode };
      const merged = { ...s, ...next };
      return { ...next, ...computeState(merged) } as Partial<SimStore>;
    });
  },

  setNetMeterInstalled(v) {
    set((s) => {
      let pcuMode = s.pcuMode;
      let statusLog = s.statusLog;
      if (!v && s.pcuMode === "grid-export") {
        // Turning the net-meter off while GRID EXPORT is active auto-falls-back
        // to SMART (factory default) with a one-shot toast (Section D).
        pcuMode = "smart";
        statusLog = [L(s.lang, "netMeterFallbackToast"), ...s.statusLog].slice(0, 4);
      }
      const next = { netMeterInstalled: v, pcuMode, statusLog };
      const merged = { ...s, ...next };
      return { ...next, ...computeState(merged) } as Partial<SimStore>;
    });
  },

  setPcuTripped(v) {
    set((s) => {
      const next = { pcuTripped: v };
      const merged = { ...s, ...next };
      return { ...next, ...computeState(merged) } as Partial<SimStore>;
    });
  },

  setOverloadRemainingSec(v) {
    set({ overloadRemainingSec: v });
  },

  appendStatusLog(msg) {
    set((s) => ({ statusLog: [msg, ...s.statusLog].slice(0, 4) }));
  },
}));
