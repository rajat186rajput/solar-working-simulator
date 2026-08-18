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
  // Cost / energy labels
  perHour:   { en: "/hr",   hi: "/घंटा" },
  perMonth:  { en: "/mo",   hi: "/माह" },
  kwhUnit:   { en: "kWh",   hi: "kWh" },
  totalCost: { en: "Total", hi: "कुल" },
  // Misc
  reset:    { en: "Reset",  hi: "रीसेट" },
  help:     { en: "Help",   hi: "सहायता" },
  english:  { en: "EN",     hi: "EN" },
  hindi:    { en: "हिं",    hi: "हिं" },
  backupIn: { en: "Backup", hi: "बैकअप" },

  // --- Real Setup mode (Section A–H, 03_REAL_SETUP_DESIGN.md) ---
  learnMode:        { en: "Learn",                       hi: "सीखें" },
  realSetupMode:    { en: "Real Setup — House No. 89",   hi: "असली सेटअप — House No. 89" },
  realSetupShort:   { en: "Real Setup",                  hi: "असली सेटअप" },

  connectionHeading:   { en: "Connection",    hi: "कनेक्शन" },
  connection1Title:    { en: "Connection 1",  hi: "कनेक्शन 1" },
  connection1Sub:      { en: "Arun's side",   hi: "अरुण की तरफ" },
  connection2Title:    { en: "Connection 2",  hi: "कनेक्शन 2" },
  connection2Sub:      { en: "Rajat's side",  hi: "रजत की तरफ" },
  otherConnectionLbl:  { en: "Other connection (tap to switch):", hi: "दूसरा कनेक्शन (बदलने को टैप करें):" },

  pcuModeHeading:      { en: "PCU MODE", hi: "PCU मोड" },
  pcuModePCU:          { en: "PCU",     hi: "PCU" },
  pcuModePCUSub:       { en: "Solar → Battery → Grid (always)", hi: "सोलर → बैटरी → ग्रिड (हमेशा)" },
  pcuModeSMART:        { en: "SMART",   hi: "SMART" },
  pcuModeSMARTBadge:   { en: "Factory default", hi: "फ़ैक्टरी डिफ़ॉल्ट" },
  pcuModeSMARTDay:     { en: "Day: Solar → Battery → Grid", hi: "दिन: सोलर → बैटरी → ग्रिड" },
  pcuModeSMARTNight:   { en: "Night: Grid → Battery", hi: "रात: ग्रिड → बैटरी" },
  pcuModeHYBRID:       { en: "HYBRID", hi: "HYBRID" },
  pcuModeHYBRIDLoad:   { en: "Load: Grid → Solar → Battery", hi: "लोड: ग्रिड → सोलर → बैटरी" },
  pcuModeHYBRIDCharge: { en: "Charge: Solar → Grid", hi: "चार्ज: सोलर → ग्रिड" },
  pcuModeGRIDEXPORT:   { en: "GRID EXPORT", hi: "GRID EXPORT" },
  pcuModeGRIDEXPORTSub:{ en: "Solar → Grid → Battery — surplus exported", hi: "सोलर → ग्रिड → बैटरी — बचा हुआ भेजा जाता है" },
  pcuGridExportDisabled:{ en: "Grid Export disabled — net-meter pending", hi: "Grid Export बंद है — नेट-मीटर लगना बाकी है" },

  netMeterHeading:     { en: "Net-Meter", hi: "नेट-मीटर" },
  netMeterLabel:       { en: "Net-meter installed?", hi: "नेट-मीटर लगा है?" },
  netMeterOnCopy:      { en: "Bidirectional net-meter present — surplus solar can be exported to DISCOM.", hi: "बाइडायरेक्शनल नेट-मीटर लगा है — बचा हुआ सोलर DISCOM को भेजा जा सकता है।" },
  netMeterOffCopy:      { en: "Grid Export disabled — net-meter pending", hi: "Grid Export बंद है — नेट-मीटर लगना बाकी है" },
  netMeterFallbackToast:{ en: "Net-meter turned off — switched back to SMART mode", hi: "नेट-मीटर बंद किया — SMART मोड पर वापस स्विच किया" },

  nameplateTitle:      { en: "System Nameplate", hi: "सिस्टम नेमप्लेट" },
  nameplateShow:       { en: "Show specs", hi: "स्पेसिफिकेशन देखें" },
  nameplateHide:       { en: "Hide specs", hi: "स्पेसिफिकेशन छुपाएं" },
  nameplateModule:     { en: "Module", hi: "मॉड्यूल" },
  nameplatePCU:        { en: "PCU / Inverter", hi: "PCU / इन्वर्टर" },
  nameplateBattery:    { en: "Battery Bank", hi: "बैटरी बैंक" },
  nameplateFootnote:   { en: "Technical specs only — for costs/accounts, ask Rajat directly.", hi: "सिर्फ टेक्निकल जानकारी — पैसों/खाते की जानकारी के लिए रजत से सीधे पूछें।" },

  overloadAmber:       { en: "Overload — trips in 60s if not reduced", hi: "ओवरलोड — 60 सेकंड में ट्रिप होगा अगर लोड कम न किया" },
  overloadRed:         { en: "Critical overload — trips in 30s", hi: "गंभीर ओवरलोड — 30 सेकंड में ट्रिप होगा" },
  overloadTripped:     { en: "PCU tripped — reduce load and reset", hi: "PCU ट्रिप हो गया — लोड कम करके रीसेट करें" },
  trippedBadge:        { en: "TRIPPED!", hi: "ट्रिप हो गया!" },
  batteryDodFloor:     { en: "Battery empty — 50% DoD limit reached (lead-acid)", hi: "बैटरी खाली — 50% DoD लिमिट पूरी (लेड-एसिड)" },
  effAbbrev:           { en: "eff.", hi: "दक्षता" },
  curtailedChip:       { en: "Curtailed", hi: "बर्बाद" },
  curtailedHint:       { en: "enable net-meter to export", hi: "एक्सपोर्ट के लिए नेट-मीटर चालू करें" },
  sidebarHint:         { en: "◀ Connections & modes", hi: "◀ कनेक्शन व मोड" },

  ruleGeyser:  { en: "Geyser rule: switch AC off before geyser on — never together.", hi: "गीज़र नियम: गीज़र ऑन करने से पहले AC बंद करें — साथ में कभी नहीं।" },
  ruleEV:      { en: "EV rule: never charge the EV during a power cut — battery empties in 1–2 hrs.", hi: "EV नियम: बिजली कटने पर EV चार्ज न करें — बैटरी 1–2 घंटे में खाली हो जाएगी।" },
  rule2AC:     { en: "2-AC rule: never run both ACs together on one connection — surge trips the 4 kW PCU.", hi: "2-AC नियम: एक कनेक्शन पर दोनों AC साथ न चलाएं — सर्ज से 4 kW PCU ट्रिप हो जाएगा।" },

  // Extra chrome used by the Real Setup implementation (not literally in the
  // spec's Copy Register table but required by the same {en,hi} shape).
  realSetupAria:       { en: "Switch between generic Learn mode and the real House No. 89 setup", hi: "Switch between generic Learn mode and the real House No. 89 setup" },
  connectionAria:      { en: "Choose active connection", hi: "Choose active connection" },
  nameplateArraySize:  { en: "Array size", hi: "ऐरे साइज़" },
  nameplateStcPmax:    { en: "STC Pmax", hi: "STC Pmax" },
  nameplateVocIsc:     { en: "Voc / Isc", hi: "Voc / Isc" },
  nameplateVmpImp:     { en: "Vmp / Imp", hi: "Vmp / Imp" },
  nameplateType:       { en: "Type", hi: "टाइप" },
  nameplateBatteryModeCap: { en: "Battery-mode cap", hi: "बैटरी-मोड कैप" },
  nameplateMainsRating:    { en: "Mains rating", hi: "मेन्स रेटिंग" },
  nameplateSpvCurrent:     { en: "SPV charge current", hi: "SPV चार्ज करंट" },
  nameplateEfficiency:     { en: "Efficiency (used)", hi: "एफिशिएंसी (उपयोग)" },
  nameplateBank:           { en: "Bank", hi: "बैंक" },
  nameplateUsable:         { en: "Usable (50% DoD)", hi: "उपयोग योग्य (50% DoD)" },
  nameplateLowCut:         { en: "Low-cut", hi: "लो-कट" },

  // GATE-2 round-3 (anchors/battery-bar/inverter-contrast/mobile-scroll fixes)
  gharApplianceHint:  { en: "☰ Appliances", hi: "☰ उपकरण" },
  swipeHint:          { en: "◀ swipe ▶", hi: "◀ स्वाइप करें ▶" },
  pcuModeMobileHeading: { en: "PCU Mode", hi: "PCU मोड" },
  nameplateCapShort:  { en: "cap", hi: "कैप" },

  // Real Setup — per-connection appliance grid split (03_ASBUILT §3.1)
  otherAppliancesShow: { en: "+ Other appliances", hi: "+ अन्य उपकरण" },
  otherAppliancesHide: { en: "− Hide other appliances", hi: "− अन्य उपकरण छुपाएं" },

  // Real Setup — sanctioned-load advisory (03_ASBUILT §2.2(e), grid-ON only,
  // never a trip). Correction #2 (owner's 2nd question, 2026-08-18): tracks
  // the actual GRID DRAW (what the PVVNL meter sees), not total household
  // load — {kw} is replaced with gridImportW/1000 to 1 decimal by the caller.
  sanctionedLoadChip:   { en: "Grid draw {kw} kW > sanctioned 4 kW", hi: "ग्रिड ड्रॉ {kw} kW > स्वीकृत 4 kW" },
  sanctionedLoadTicker: { en: "Sanctioned load 4 kW exceeded — PVVNL penalty risk", hi: "स्वीकृत भार 4 kW से ऊपर — PVVNL पेनल्टी का जोखिम" },
  nameplateSanctionedLoad: { en: "Sanctioned load (grid draw)", hi: "स्वीकृत भार (ग्रिड ड्रॉ)" },

  // Correction #2 — inverter genuinely hit its 4kW throughput cap while
  // grid was available; grid (not a trip) covers the rest.
  inverterAtCapStatus: { en: "Inverter at 4 kW cap — grid supplying the rest", hi: "इन्वर्टर 4 kW कैप पर — बाकी ग्रिड से मिल रहा है" },
} as const

export type LabelKey = keyof typeof LABELS

export const L = (lang: Lang, key: LabelKey): string => LABELS[key][lang]
