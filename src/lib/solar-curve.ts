import type { DayType } from "./types";

// Hour-by-hour generation factors (% of rated kWp)
// Based on Bijnor 26°N, 5.0 PSH clear day
// Index 0 = 5 AM, index 14 = 7 PM
export const SOLAR_CURVE: Record<DayType, number[]> = {
  clear: [
    1,   // 5 AM
    5,   // 6 AM
    10,  // 7 AM
    30,  // 8 AM
    55,  // 9 AM
    75,  // 10 AM
    90,  // 11 AM
    95,  // 12 PM
    90,  // 1 PM
    75,  // 2 PM
    55,  // 3 PM
    30,  // 4 PM
    10,  // 5 PM
    3,   // 6 PM
    0,   // 7 PM
  ],
  cloudy: [
    0, 2, 4, 12, 22, 30, 36, 38, 36, 30, 22, 12, 4, 1, 0,
  ],
  monsoon: [
    0, 1, 2, 5, 8, 11, 14, 14, 14, 11, 8, 5, 2, 0, 0,
  ],
};

// Start hour for the curve array
export const CURVE_START_HOUR = 5;
export const CURVE_END_HOUR = 19; // inclusive last index

/**
 * Get solar generation in watts for a given hour, day type, and panel capacity.
 * Returns 0 for night hours.
 */
export function getSolarW(
  hour: number,
  dayType: DayType,
  panelKwp: number
): number {
  if (hour < CURVE_START_HOUR || hour >= CURVE_END_HOUR) return 0;
  const idx = hour - CURVE_START_HOUR;
  const factor = SOLAR_CURVE[dayType][idx] / 100;
  return factor * panelKwp * 1000;
}

/**
 * Get sparkline points for a full day (5AM–7PM) for charting
 */
export function getDaySparkline(dayType: DayType, panelKwp: number) {
  return SOLAR_CURVE[dayType].map((factor, idx) => ({
    hour: CURVE_START_HOUR + idx,
    label: `${CURVE_START_HOUR + idx}:00`,
    watts: (factor / 100) * panelKwp * 1000,
  }));
}
