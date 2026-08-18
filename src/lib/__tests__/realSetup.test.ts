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
