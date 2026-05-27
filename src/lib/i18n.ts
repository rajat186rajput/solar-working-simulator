export type Lang = "en" | "hi"

export const t = (lang: Lang, en: string, hi: string) => lang === "hi" ? hi : en

export const LABELS = {
  // Time presets
  dawn:    { en: "Dawn",    hi: "फ़जर" },
  morning: { en: "Morning", hi: "सुबह" },
  noon:    { en: "Noon",    hi: "दोपहर" },
  evening: { en: "Evening", hi: "शाम" },
  night:   { en: "Night",   hi: "रात" },
  // Weather
  clear:   { en: "Clear",   hi: "धूप" },
  cloudy:  { en: "Cloudy",  hi: "बादल" },
  monsoon: { en: "Monsoon", hi: "बारिश" },
  // Modes
  onGrid:  { en: "On-Grid",  hi: "ग्रिड" },
  offGrid: { en: "Off-Grid", hi: "ऑफ-ग्रिड" },
  hybrid:  { en: "Hybrid",   hi: "हाइब्रिड" },
  // Battery
  batteryOn:   { en: "ON",        hi: "चालू" },
  batteryOff:  { en: "OFF",       hi: "बंद" },
  fullIn:      { en: "Full in",   hi: "फुल होगी" },
  emptyIn:     { en: "Empty in",  hi: "खाली होगी" },
  idle:        { en: "~ Idle",    hi: "~ रुकी हुई" },
  manual:      { en: "manual",    hi: "मैनुअल" },
  auto:        { en: "auto",      hi: "ऑटो" },
  // Nodes
  solarPanels: { en: "Solar Panels",    hi: "सोलर पैनल" },
  battery:     { en: "Battery",         hi: "बैटरी" },
  inverter:    { en: "Hybrid Inverter", hi: "इन्वर्टर" },
  gharLoad:    { en: "Ghar (Load)",     hi: "घर (लोड)" },
  grid:        { en: "UPPCL Grid",      hi: "UPPCL ग्रिड" },
  gridAvail:   { en: "Available",       hi: "उपलब्ध" },
  gridBijli:   { en: "Bijli ON",        hi: "बिजली चालू" },
  gridOff:     { en: "Bijli OFF",       hi: "बिजली बंद" },
  // Appliance drawer
  appliancesTitle: { en: "🏠 Ghar Load", hi: "🏠 घर का लोड" },
  gridOnly:        { en: "Grid Only",    hi: "सिर्फ ग्रिड" },
  wEach:           { en: "W each",       hi: "W प्रत्येक" }, // prepend appliance.watts directly before this
  // Source badges
  solarBadge: { en: "☀️ Solar", hi: "☀️ सोलर" },
  gridBadge:  { en: "⚡ Grid",  hi: "⚡ ग्रिड" },
  // Misc
  reset:    { en: "Reset",  hi: "रीसेट" },
  help:     { en: "Help",   hi: "सहायता" },
  english:  { en: "EN",     hi: "EN" },
  hindi:    { en: "हिं",    hi: "हिं" },
  backupIn: { en: "Backup", hi: "बैकअप" },
} as const

export type LabelKey = keyof typeof LABELS

export const L = (lang: Lang, key: LabelKey): string => LABELS[key][lang]
