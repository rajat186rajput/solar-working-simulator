"use client";

import { useSimStore } from "@/store/simulation-store";
import { DashboardTile } from "./DashboardTile";
import { formatWh } from "@/lib/utils";
import { calcBackupHours } from "@/lib/simulation";

export function DashboardColumn() {
  const {
    solarW,
    loadW,
    batterySoc,
    batteryKwh,
    batteryType,
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

  const backupHours = showBattery
    ? calcBackupHours(batterySoc, batteryKwh, batteryType, loadW)
    : 0;
  const backupDisplay =
    !showBattery
      ? "N/A"
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

  // Max solar for fill fraction (4.4kWp max ~4400W)
  const solarFill = Math.min(solarW / 4400, 1);
  // Load fill fraction (inverter cap 6200W)
  const loadFill = Math.min(loadW / 6200, 1);

  return (
    <div className="flex flex-col h-full gap-1.5 py-2 px-1.5">
      {/* Solar */}
      <div className="flex-1 rounded-xl border border-surface-stroke bg-surface-card/60 min-h-0">
        <DashboardTile
          label="Solar"
          icon="☀️"
          value={solarW}
          unit="W"
          color="#F6C90E"
          fillFraction={solarFill}
          fillColor="#F6C90E"
        />
      </div>

      {/* Load */}
      <div className="flex-1 rounded-xl border border-surface-stroke bg-surface-card/60 min-h-0">
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

      {/* Battery */}
      <div className="flex-1 rounded-xl border border-surface-stroke bg-surface-card/60 min-h-0">
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

      {/* Grid */}
      <div className="flex-1 rounded-xl border border-surface-stroke bg-surface-card/60 min-h-0">
        <DashboardTile
          label="Grid"
          icon="🔌"
          value={0}
          textValue={gridAvailable ? "OK" : "FAIL"}
          textColor={gridAvailable ? "#22C55E" : "#EF4444"}
          subLine={gridAvailable ? "UPPCL" : "Bijli Gayi!"}
          subLineColor={gridAvailable ? "#475569" : "#EF4444"}
        />
      </div>

      {/* Net Meter */}
      <div className="flex-1 rounded-xl border border-surface-stroke bg-surface-card/60 min-h-0">
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

      {/* Backup Time */}
      <div className="flex-1 rounded-xl border border-surface-stroke bg-surface-card/60 min-h-0">
        <DashboardTile
          label="Backup"
          icon="⏱️"
          value={0}
          textValue={backupDisplay}
          textColor={
            !showBattery
              ? "#475569"
              : backupHours > 4
              ? "#22C55E"
              : backupHours > 1
              ? "#EAB308"
              : "#EF4444"
          }
          subLine="At current load"
          subLineColor="#475569"
        />
      </div>
    </div>
  );
}
