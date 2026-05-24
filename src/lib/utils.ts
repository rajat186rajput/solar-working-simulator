import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function formatWatts(w: number): string {
  if (w >= 1000) {
    return `${(w / 1000).toFixed(1)} kW`;
  }
  return `${Math.round(w)} W`;
}

export function formatWh(wh: number): string {
  const sign = wh >= 0 ? "+" : "";
  if (Math.abs(wh) >= 1000) {
    return `${sign}${(wh / 1000).toFixed(2)} kWh`;
  }
  return `${sign}${Math.round(wh)} Wh`;
}

export function calcStrokeWidth(powerW: number): number {
  return clamp(2 + powerW / 600, 2, 12);
}

export function formatTime(hour: number): string {
  if (hour === 0 || hour === 24) return "12:00 AM";
  if (hour === 12) return "12:00 PM";
  if (hour > 12) return `${hour - 12}:00 PM`;
  return `${hour}:00 AM`;
}
