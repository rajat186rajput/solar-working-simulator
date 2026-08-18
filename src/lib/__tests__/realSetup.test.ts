// Energy-balance regression tests for lib/realSetup.ts — added per code review
// finding R18 (proves R1/R2 are actually fixed, not just "looks right").
//
// Core invariant checked throughout: power in == power out, every tick.
//   solarW + gridImportW + batteryDischargeW  ==  loadW + batteryChargeW + gridExportW + curtailedW
// (solar generation + grid import + battery discharge are the sources;
//  load, battery charge, grid export, and curtailed/wasted solar are the sinks.)
// This is a stronger, more general check than tracking "loadFromSolar"
// separately — it fails loudly if any watt is created or destroyed inside
// runPcuSimulation, which is exactly the class of bug R1 was.

import { describe, expect, it } from "vitest";
import {
  runPcuSimulation,
  CONNECTION_APPLIANCE_QTYS,
  CONNECTION_BOOT_ON,
  SANCTIONED_LOAD_W,
  PCU_CAP_W,
  type RealSetupInput,
} from "../realSetup";
import { APPLIANCES, getApplianceById } from "../appliances";
import type { ConnectionId, PcuMode } from "../types";

const DAY_HOUR = 12; // noon — near-peak solar
const NIGHT_HOUR = 22; // 10 PM — zero solar

function baseInput(overrides: Partial<RealSetupInput> = {}): RealSetupInput {
  return {
    pcuMode: "smart",
    timeHour: DAY_HOUR,
    dayType: "clear",
    gridAvailable: true,
    netMeterInstalled: true,
    batterySoc: 0.8,
    batteryKwh: 7.2,
    batteryType: "lead-acid",
    batteryOn: true,
    panelKwp: 4.8,
    solarOn: true,
    // Kept below the lead-acid max battery rate (~1440W) so off-grid deficit
    // scenarios don't trip systemOffline (battery alone can always cover it) —
    // that's a distinct, already-covered code path, not what these tests probe.
    loadW: 900,
    currentNetMeterWh: 0,
    pcuTripped: false,
    ...overrides,
  };
}

const TOL = 1; // watts — rounding slack matching the engine's own `> 1` thresholds

function assertEnergyBalance(input: RealSetupInput, label: string) {
  const r = runPcuSimulation(input);
  if (r.systemOffline) {
    // Load isn't fully met — the conservation equation legitimately doesn't
    // balance to loadW in this case (that's the whole point of "offline").
    // What must still hold: nothing was fabricated on the sink side.
    expect(r.curtailedW, `${label}: curtailedW while offline`).toBe(0);
    expect(r.gridExportW, `${label}: gridExportW while offline`).toBe(0);
    return;
  }
  const sources = r.solarW + r.gridImportW + r.batteryDischargeW;
  const sinks = r.loadW + r.batteryChargeW + r.gridExportW + r.curtailedW;
  expect(sources, `${label}: sources(${sources}) vs sinks(${sinks})`).toBeCloseTo(sinks, 0);
  // Never both charge and discharge in the same tick.
  expect(r.batteryChargeW === 0 || r.batteryDischargeW === 0, `${label}: simultaneous charge+discharge`).toBe(true);
  void TOL;
}

describe("runPcuSimulation — energy balance (R18)", () => {
  const MODES: PcuMode[] = ["pcu", "smart", "hybrid-pcu", "grid-export"];
  const HOURS = [DAY_HOUR, NIGHT_HOUR];
  const GRID = [true, false];

  for (const mode of MODES) {
    for (const hour of HOURS) {
      for (const grid of GRID) {
        it(`${mode} / ${hour === DAY_HOUR ? "day" : "night"} / grid=${grid}`, () => {
          const input = baseInput({ pcuMode: mode, timeHour: hour, gridAvailable: grid });
          assertEnergyBalance(input, `${mode}/${hour}/${grid}`);
        });
      }
    }
  }

  // ── R1 regression: HYBRID low-solar (0 < solar < SPV_CHARGE_CAP_W) ──────
  // Before the fix, chargeFromGrid() overwrote chargeFromSolar()'s result
  // instead of adding to it, so the solar contribution silently vanished.
  it("R1: HYBRID grid-on with low solar (500W) — solar + grid both land in the charge total", () => {
    // panelKwp tuned so getSolarW(...) * PCU_EFF ≈ 500W at noon on a clear day.
    const input = baseInput({
      pcuMode: "hybrid-pcu",
      gridAvailable: true,
      panelKwp: 500 / (1.0 * 0.9 * 1000), // factor=1.0 at noon, PCU_EFF=0.9
      loadW: 1000,
    });
    const r = runPcuSimulation(input);
    expect(r.solarW).toBeCloseTo(500, 0);
    // Combined charge cap is min(SPV_CHARGE_CAP_W≈972, maxRateW) — with a
    // healthy 7.2kWh lead-acid bank maxRateW > 972, so the cap is 972W and
    // the fix means solar(500) + grid top-up(472) both land in the charge.
    expect(r.batteryChargeW).toBeGreaterThan(500); // would be ~472 pre-fix (bug), never >500
    expect(r.batteryChargeW).toBeCloseTo(972, 0);
    expect(r.gridImportW).toBeCloseTo(1000 + (972 - 500), 0); // load + grid top-up
    assertEnergyBalance(input, "R1 HYBRID low-solar");
  });

  // ── R2 regression: GRID EXPORT night deficit — grid imports, battery untouched ──
  // Before the fix, a deficit in GRID EXPORT mode discharged the battery
  // FIRST even though the declared/advertised chain is Solar → Grid → Battery.
  it("R2: GRID EXPORT night deficit with grid available — grid covers it, battery untouched", () => {
    const input = baseInput({
      pcuMode: "grid-export",
      netMeterInstalled: true,
      timeHour: NIGHT_HOUR,
      gridAvailable: true,
      loadW: 900,
      batterySoc: 0.9, // plenty of charge available — if the bug were still
      // present this would visibly drain instead of staying untouched.
    });
    const r = runPcuSimulation(input);
    expect(r.solarW).toBe(0);
    expect(r.gridImportW).toBeCloseTo(900, 0);
    expect(r.batteryDischargeW).toBe(0);
    expect(r.batteryNewSoc).toBeCloseTo(0.9, 5);
    assertEnergyBalance(input, "R2 GRID EXPORT night deficit");
  });

  // ── LEAD-2 regression: net-meter OFF, big surplus — must show up as curtailedW ──
  it("LEAD-2: PCU mode, net-meter off, solar surplus beyond the charge cap is curtailed (not silently dropped)", () => {
    const input = baseInput({
      pcuMode: "pcu",
      netMeterInstalled: false,
      panelKwp: 4.8,
      loadW: 2000,
      batterySoc: 0.2, // plenty of headroom to charge, so the cap (not a full battery) is what's binding
    });
    const r = runPcuSimulation(input);
    expect(r.curtailedW).toBeGreaterThan(0);
    assertEnergyBalance(input, "LEAD-2 curtailment");
  });
});

// ─── Per-connection appliance defaults (03_ASBUILT.md §3.1, owner-confirmed
// 2026-08-18) — CONNECTION_APPLIANCE_QTYS / CONNECTION_BOOT_ON ─────────────
describe("Per-connection appliance defaults (03_ASBUILT §3.1)", () => {
  const CATALOG_IDS = new Set(APPLIANCES.map((a) => a.id));
  const CONNECTIONS: ConnectionId[] = ["connection-1", "connection-2"];

  const C1_KITCHEN_EV_PC = ["mixer", "microwave", "chimney", "toaster", "air-fryer", "water-bag", "ev", "pc"];
  const C2_NOT_PRESENT = ["tv", "geyser", "washing", "pump"];

  it("Connection 1 has zero kitchen appliances, zero EV, zero PC", () => {
    for (const id of C1_KITCHEN_EV_PC) {
      expect(CONNECTION_APPLIANCE_QTYS["connection-1"][id], `C1 qty for ${id}`).toBe(0);
    }
  });

  it("Connection 2 has zero of TV/geyser/washing-machine/pump", () => {
    for (const id of C2_NOT_PRESENT) {
      expect(CONNECTION_APPLIANCE_QTYS["connection-2"][id], `C2 qty for ${id}`).toBe(0);
    }
  });

  it("Connection 2's confirmed kitchen + EV + PC set is nonzero", () => {
    const shouldBeOnC2 = ["mixer", "microwave", "chimney", "toaster", "air-fryer", "water-bag", "ev", "pc", "ac", "fridge", "fan"];
    for (const id of shouldBeOnC2) {
      expect(CONNECTION_APPLIANCE_QTYS["connection-2"][id], `C2 qty for ${id}`).toBeGreaterThan(0);
    }
  });

  it("Both connections' quantity maps only reference existing catalog ids", () => {
    for (const conn of CONNECTIONS) {
      const map = CONNECTION_APPLIANCE_QTYS[conn];
      for (const id of Object.keys(map)) {
        expect(CATALOG_IDS.has(id), `${conn} qty map has unknown id "${id}"`).toBe(true);
      }
    }
  });

  it("Both connections' boot-ON id lists only reference existing catalog ids", () => {
    for (const conn of CONNECTIONS) {
      for (const id of CONNECTION_BOOT_ON[conn]) {
        expect(CATALOG_IDS.has(id), `${conn} boot-ON has unknown id "${id}"`).toBe(true);
      }
    }
  });

  it("Per-connection default (boot) ON-load is <= 4000W (PCU_CAP_W)", () => {
    for (const conn of CONNECTIONS) {
      const qtyMap = CONNECTION_APPLIANCE_QTYS[conn];
      const bootOnW = CONNECTION_BOOT_ON[conn].reduce((sum, id) => {
        const appliance = getApplianceById(id);
        const qty = qtyMap[id] ?? 0;
        if (!appliance || qty <= 0) return sum;
        return sum + appliance.watts * qty;
      }, 0);
      expect(bootOnW, `${conn} boot ON-load`).toBeLessThanOrEqual(4000);
      expect(bootOnW, `${conn} boot ON-load should be nonzero`).toBeGreaterThan(0);
    }
  });
});

// ─── Grid-available overload correction (03_ASBUILT.md §2.2(e)) ────────────
// Owner question 2026-08-18, "grid hai to trip kyu?" ("why does it trip if
// grid is on?") on a preview showing SMART mode, grid ON, solar 4018W, load
// 4003W -> red "Overload — trips in 60s". That was a bug: the 4kW PCU_CAP_W
// trip/countdown timers model the INVERTER's own battery/solar->AC path and
// only apply when the inverter is the SOLE source (grid OFF/failed). With
// grid available, any load beyond the inverter's own throughput is picked
// up directly by the grid (mains/grid-tie changeover) — no trip. This
// simulator implements the correction's own permitted fallback ("or simply
// cap the sim at 'no trip below 10kW with grid ON' and document"): while
// gridAvailable is true, overloadBand is unconditionally "none" (see the
// comment above its assignment in realSetup.ts) — no household default
// combo in this simulator gets anywhere near the manual's own Grid-Tie-ON
// table threshold (>=10kW) anyway. Separately, the PVVNL SANCTIONED LOAD
// (4kW/connection, a billing limit, not a hardware one) gets a NEW,
// non-tripping advisory (sanctionedLoadExceeded) whenever grid is on and
// draw exceeds it.
describe("Grid-available overload correction (03_ASBUILT §2.2(e))", () => {
  // (a) SMART day, grid ON, solar plentiful (~4.3kW at noon on 4.8kWp),
  // load just over the 4kW inverter cap (4003W) -> must NOT overload/trip;
  // grid backstops it (here, solar alone already covers the load).
  it("(a) grid ON, load just over PCU_CAP_W (4003W) -> overloadBand none, no trip, energy balance holds", () => {
    const input = baseInput({
      pcuMode: "smart",
      gridAvailable: true,
      loadW: PCU_CAP_W + 3, // 4003W
    });
    const r = runPcuSimulation(input);
    expect(r.overloadBand).toBe("none");
    expect(r.systemOffline).toBe(false);
    expect(r.inverterOverload).toBe(false);
    expect(r.gridImportW).toBeGreaterThanOrEqual(0);
    assertEnergyBalance(input, "(a) grid ON, load 4003W");
  });

  // (b) Same load, grid OFF -> the classic inverter-mode band DOES apply:
  // 4003/4000 = 100.075% -> "amber" (100-120% band, 60s countdown lives in
  // OverloadWatcher.tsx, not this pure function — but the band itself,
  // which drives that countdown, must fire here).
  it("(b) same load (4003W), grid OFF -> overloadBand amber (inverter-mode countdown band)", () => {
    const input = baseInput({
      pcuMode: "smart",
      gridAvailable: false,
      loadW: PCU_CAP_W + 3, // 4003W
      batterySoc: 0.9, // plenty of charge so this doesn't ALSO trip systemOffline for an unrelated reason
    });
    const r = runPcuSimulation(input);
    expect(r.overloadBand).toBe("amber");
    expect(r.sanctionedLoadExceeded).toBe(false); // advisory is grid-ON only
    assertEnergyBalance(input, "(b) grid OFF, load 4003W");
  });

  // (c) Grid ON, load 4500W (above the 4kW PVVNL sanction, still nowhere
  // near the manual's Grid-Tie-ON overload table) -> sanctioned-load
  // advisory true, but still no trip/overload.
  it("(c) grid ON, load 4500W -> sanctionedLoadExceeded true, overloadBand none, no trip", () => {
    const input = baseInput({
      pcuMode: "smart",
      gridAvailable: true,
      loadW: 4500,
    });
    const r = runPcuSimulation(input);
    expect(r.sanctionedLoadExceeded).toBe(true);
    expect(4500).toBeGreaterThan(SANCTIONED_LOAD_W);
    expect(r.overloadBand).toBe("none");
    expect(r.systemOffline).toBe(false);
    assertEnergyBalance(input, "(c) grid ON, load 4500W sanctioned advisory");
  });

  // (d) Grid ON, load 11000W (>=200% of the 5kVA mains rating -- the
  // manual's own Grid-Tie-ON table technically starts its 10-minute amber
  // band here) -> documented cap chosen per 03_ASBUILT §2.2(e): no trip
  // modelled for grid-tie at all (household defaults never get close to
  // this in practice) -> overloadBand still "none", advisory still true,
  // grid fully covers the huge deficit, no trip.
  it("(d) grid ON, load 11000W (>=200% of 5kVA) -> documented no-trip cap holds, sanctioned advisory true", () => {
    const input = baseInput({
      pcuMode: "smart",
      gridAvailable: true,
      loadW: 11000,
    });
    const r = runPcuSimulation(input);
    expect(r.overloadBand).toBe("none");
    expect(r.sanctionedLoadExceeded).toBe(true);
    expect(r.systemOffline).toBe(false);
    expect(r.inverterOverload).toBe(false);
    expect(r.gridImportW).toBeGreaterThan(0); // grid is doing the heavy lifting
    assertEnergyBalance(input, "(d) grid ON, load 11000W grid-tie cap");
  });

  // Sanity: the advisory never fires with grid OFF, regardless of load.
  it("sanctionedLoadExceeded is always false when grid is OFF", () => {
    const input = baseInput({ gridAvailable: false, loadW: 9000, batterySoc: 0.9 });
    const r = runPcuSimulation(input);
    expect(r.sanctionedLoadExceeded).toBe(false);
  });
});
