"use client";

import { useSimStore } from "@/store/simulation-store";
import { DashboardTile } from "./DashboardTile";
import { Switch } from "@/components/ui/switch";
import { formatWh } from "@/lib/utils";
import { calcBackupHours } from "@/lib/simulation";

// ─── Solar capacity presets ────────────────────────────────────────────────
const SOLAR_PRESETS = [
  { label: "2 kWp", kwp: 2 },
  { label: "4.4",   kwp: 4.4 },
  { label: "5 kWp", kwp: 5 },
  { label: "7 kWp", kwp: 7 },
  { label: "10",    kwp: 10 },
];

// ─── Battery capacity presets ──────────────────────────────────────────────
interface BatteryPreset {
  label: string;
  kwh: number;
  chemistry: "lifepo4" | "lead-acid";
  isNone?: boolean;
}

const BATTERY_PRESETS: BatteryPreset[] = [
  { label: "None",    kwh: 0,   chemistry: "lifepo4",   isNone: true },
  { label: "5 kWh",  kwh: 5,   chemistry: "lifepo4"   },
  { label: "10",     kwh: 10,  chemistry: "lifepo4"   },
  { label: "15",     kwh: 15,  chemistry: "lifepo4"   },
  { label: "20",     kwh: 20,  chemistry: "lifepo4"   },
  { label: "7.2 PbA",kwh: 7.2, chemistry: "lead-acid" },
];

// ─── Shared pill / toggle styles ──────────────────────────────────────────
function pill(active: boolean, activeColor: string, disabled = false) {
  return {
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600 as const,
    fontFamily: "Inter, sans-serif",
    border: `1px solid ${active ? activeColor : "#334155"}`,
    background: active ? `${activeColor}22` : "transparent",
    color: active ? activeColor : "#64748B",
    cursor: disabled ? "not-allowed" as const : "pointer" as const,
    opacity: disabled ? 0.4 : 1,
    lineHeight: "1.4",
  };
}

// ─── Solar controls ────────────────────────────────────────────────────────
function SolarControls() {
  const { solarOn, toggleSolar, panelKwp, setPanelKwp } = useSimStore();

  return (
    <div className="flex flex-col gap-1">
      {/* ON/OFF row */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: solarOn ? "#F6C90E" : "#64748B" }}
        >
          {solarOn ? "ON" : "OFF"}
        </span>
        <Switch
          checked={solarOn}
          onCheckedChange={toggleSolar}
          aria-label="Toggle solar panels"
        />
      </div>
      {/* Capacity pills */}
      <div className="flex flex-wrap gap-1">
        {SOLAR_PRESETS.map((p) => (
          <button
            key={p.kwp}
            onClick={() => setPanelKwp(p.kwp)}
            disabled={!solarOn}
            style={pill(panelKwp === p.kwp && solarOn, "#F6C90E", !solarOn)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {/* Status micro-text */}
      <div
        className="text-[10px] leading-none"
        style={{ color: solarOn ? "#F6C90E99" : "#47556999" }}
      >
        {solarOn ? `${panelKwp} kWp · ~${(panelKwp * 4.5).toFixed(0)} kWh/day` : "Disconnected"}
      </div>
    </div>
  );
}

// ─── Battery controls ──────────────────────────────────────────────────────
function BatteryControls() {
  const {
    batteryKwh, setBatteryKwh,
    batteryType, setBatteryType,
    batteryOn, toggleBattery,
  } = useSimStore();

  const isNoneActive = batteryKwh <= 0 || !batteryOn;

  const handlePreset = (p: BatteryPreset) => {
    setBatteryKwh(p.kwh);
    setBatteryType(p.chemistry);
    if (p.isNone && batteryOn) toggleBattery();
    if (!p.isNone && !batteryOn) toggleBattery();
  };

  const activePreset = isNoneActive
    ? BATTERY_PRESETS.find((p) => p.isNone)
    : BATTERY_PRESETS.find((p) => !p.isNone && p.kwh === batteryKwh && p.chemistry === batteryType);

  return (
    <div className="flex flex-col gap-1">
      {/* ON/OFF row */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: batteryOn ? "#10B981" : "#64748B" }}
        >
          {batteryOn ? "ON" : "OFF"}
        </span>
        <Switch
          checked={batteryOn}
          onCheckedChange={toggleBattery}
          aria-label="Toggle battery"
        />
      </div>
      {/* Capacity pills */}
      <div className="flex flex-wrap gap-1">
        {BATTERY_PRESETS.map((p) => {
          const isActive = p.isNone
            ? isNoneActive
            : (!isNoneActive && activePreset?.kwh === p.kwh && activePreset?.chemistry === p.chemistry);
          return (
            <button
              key={`${p.kwh}-${p.chemistry}`}
              onClick={() => handlePreset(p)}
              style={pill(
                isActive,
                p.isNone ? "#64748B" : "#10B981",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {/* LFP / PbA chemistry mini-toggle */}
      <div className="flex gap-1">
        {(["lifepo4", "lead-acid"] as const).map((chem) => (
          <button
            key={chem}
            onClick={() => !isNoneActive && setBatteryType(chem)}
            disabled={isNoneActive}
            style={{
              ...pill(batteryType === chem && !isNoneActive, "#10B981", isNoneActive),
              flex: 1,
              textAlign: "center" as const,
            }}
          >
            {chem === "lifepo4" ? "LFP" : "PbA"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Grid controls ─────────────────────────────────────────────────────────
function GridControls() {
  const { gridAvailable, setGridAvailable, mode } = useSimStore();

  return (
    <div className="flex flex-col gap-1">
      {/* Bijli ON/OFF row */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-bold"
          style={{ color: gridAvailable ? "#3B82F6" : "#EF4444" }}
        >
          {gridAvailable ? "Bijli ON" : "Bijli OFF"}
        </span>
        <Switch
          checked={gridAvailable}
          onCheckedChange={setGridAvailable}
          aria-label="Toggle grid availability"
        />
      </div>
      {!gridAvailable && (
        <div className="text-[10px] leading-snug" style={{ color: "#EF444488" }}>
          {mode === "on-grid" ? "Solar bhi band (anti-island)" : "Battery se chal raha hai"}
        </div>
      )}
    </div>
  );
}

// ─── Main column ───────────────────────────────────────────────────────────
export function DashboardColumn() {
  const {
    solarW,
    loadW,
    batterySoc,
    batteryKwh,
    batteryType,
    batteryOn,
    panelKwp,
    gridAvailable,
    netMeterWh,
    batteryChargeW,
    batteryDischargeW,
    mode,
  } = useSimStore();

  const showBattery = mode === "off-grid" || mode === "hybrid";

  const socColor =
    batterySoc >= 0.8
      ? "#22C55E"
      : batterySoc >= 0.4
      ? "#EAB308"
      : batterySoc >= 0.2
      ? "#F97316"
      : "#EF4444";

  const backupHours = showBattery && batteryOn
    ? calcBackupHours(batterySoc, batteryKwh, batteryType, loadW)
    : 0;
  const backupDisplay =
    !showBattery
      ? "N/A"
      : !batteryOn
      ? "—"
      : backupHours > 24
      ? "24+ hr"
      : `${backupHours.toFixed(1)} hr`;

  const battSubLine =
    batteryChargeW > 0
      ? `Charging ${Math.round(batteryChargeW)}W`
      : batteryDischargeW > 0
      ? `Discharging ${Math.round(batteryDischargeW)}W`
      : undefined;

  const battSubColor =
    batteryChargeW > 0 ? "#22C55E" : "#F97316";

  const solarFill = Math.min(solarW / (panelKwp * 1000), 1);
  const loadFill = Math.min(loadW / 6200, 1);

  return (
    <div className="flex flex-col h-full gap-1.5 py-2 px-1.5 overflow-y-auto scrollbar-thin">

      {/* Solar — with ON/OFF + capacity pills */}
      <div
        className="rounded-xl border border-surface-stroke bg-surface-card/60 overflow-hidden"
      >
        <DashboardTile
          label="Solar"
          icon="☀️"
          value={solarW}
          unit="W"
          color="#F6C90E"
          fillFraction={solarFill}
          fillColor="#F6C90E"
          extra={<SolarControls />}
        />
      </div>

      {/* Load — readout only */}
      <div className="rounded-xl border border-surface-stroke bg-surface-card/60 overflow-hidden">
        <DashboardTile
          label="Load"
          icon="⚡"
          value={loadW}
          unit="W"
          color={loadW > 6200 ? "#EF4444" : "#F1F5F9"}
          fillFraction={loadFill}
          fillColor={loadW > 6200 ? "#EF4444" : "#94A3B8"}
        />
      </div>

      {/* Battery — with ON/OFF + capacity pills + LFP/PbA toggle */}
      <div
        className="rounded-xl border border-surface-stroke bg-surface-card/60 overflow-hidden"
      >
        {showBattery ? (
          <DashboardTile
            label="Battery"
            icon="🔋"
            value={Math.round(batterySoc * 100)}
            unit="%"
            color={socColor}
            fillFraction={batterySoc}
            fillColor={socColor}
            subLine={battSubLine}
            subLineColor={battSubColor}
            extra={<BatteryControls />}
          />
        ) : (
          <DashboardTile
            label="Battery"
            icon="🔋"
            value={0}
            textValue="—"
            textColor="#475569"
            subLine="On-Grid mode"
            subLineColor="#475569"
          />
        )}
      </div>

      {/* Grid — with Bijli ON/OFF switch, red border when off */}
      <div
        className="rounded-xl border bg-surface-card/60 overflow-hidden"
        style={{
          borderColor: gridAvailable ? "var(--color-surface-stroke)" : "#EF4444",
          background: gridAvailable ? undefined : "rgba(239,68,68,0.06)",
        }}
      >
        <DashboardTile
          label="Grid"
          icon="🔌"
          value={0}
          textValue={gridAvailable ? "OK" : "FAIL"}
          textColor={gridAvailable ? "#22C55E" : "#EF4444"}
          subLine={gridAvailable ? "UPPCL" : "Bijli Gayi!"}
          subLineColor={gridAvailable ? "#475569" : "#EF4444"}
          extra={<GridControls />}
        />
      </div>

      {/* Net Meter — readout only */}
      <div className="rounded-xl border border-surface-stroke bg-surface-card/60 overflow-hidden">
        <DashboardTile
          label="Net Meter"
          icon="📊"
          value={netMeterWh}
          formatFn={formatWh}
          color={netMeterWh >= 0 ? "#22C55E" : "#EF4444"}
          subLine="Today"
          subLineColor="#475569"
        />
      </div>

      {/* Backup Time — readout only */}
      <div className="rounded-xl border border-surface-stroke bg-surface-card/60 overflow-hidden">
        <DashboardTile
          label="Backup"
          icon="⏱️"
          value={0}
          textValue={backupDisplay}
          textColor={
            !showBattery || !batteryOn
              ? "#475569"
              : backupHours > 4
              ? "#22C55E"
              : backupHours > 1
              ? "#EAB308"
              : "#EF4444"
          }
          subLine={batteryOn ? "At current load" : "Battery OFF"}
          subLineColor="#475569"
        />
      </div>
    </div>
  );
}
