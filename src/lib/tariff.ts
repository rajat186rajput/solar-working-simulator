// UPPCL LMV-1 slab tariff — effective after subsidy, Mandawar, Bijnore (May 2026 bill)

export const UPPCL_SLABS = [
  { uptoUnits: 100,       ratePerUnit: 5.50 },
  { uptoUnits: 150,       ratePerUnit: 5.50 },
  { uptoUnits: 300,       ratePerUnit: 6.00 },
  { uptoUnits: Infinity,  ratePerUnit: 6.50 },
]

export const FIXED_DEMAND_PER_KW = 110 // ₹/kW/month

/**
 * Calculate total energy cost for a given monthly kWh consumption.
 * Uses progressive slab billing (not average rate).
 */
export function calcMonthlyCost(kwhPerMonth: number): number {
  if (kwhPerMonth <= 0) return 0
  let remaining = kwhPerMonth
  let cost = 0
  let prev = 0
  for (const slab of UPPCL_SLABS) {
    const slabSize = slab.uptoUnits === Infinity ? remaining : slab.uptoUnits - prev
    const inSlab = Math.min(remaining, slabSize)
    cost += inSlab * slab.ratePerUnit
    remaining -= inSlab
    prev = slab.uptoUnits
    if (remaining <= 0) break
  }
  return cost
}

/**
 * Effective (blended) rate per unit for a given monthly consumption.
 */
export function effectiveRate(kwhPerMonth: number): number {
  if (kwhPerMonth <= 0) return 0
  return calcMonthlyCost(kwhPerMonth) / kwhPerMonth
}

/**
 * Format a rupee amount compactly.
 *   < ₹1   → paise  (e.g. "₹0p" — edge case only)
 *   ≥ ₹1000 → "₹1.2k"
 *   else    → "₹123"
 */
export function fmtRs(amount: number): string {
  if (amount <= 0) return "₹0"
  if (amount < 1) return `₹${(amount * 100).toFixed(0)}p`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`
  return `₹${Math.round(amount)}`
}

/**
 * Parse a typicalHoursPerDay string from appliances.ts into a numeric average.
 * Examples:
 *   "6-10 hr" → 8
 *   "24 hr"   → 24
 *   "0.25 hr" → 0.25
 *   "1-2 hr"  → 1.5
 */
export function parseHours(s: string): number {
  const m = s.match(/^([\d.]+)(?:-([\d.]+))?/)
  if (!m) return 1
  const lo = parseFloat(m[1])
  const hi = m[2] ? parseFloat(m[2]) : lo
  return (lo + hi) / 2
}
