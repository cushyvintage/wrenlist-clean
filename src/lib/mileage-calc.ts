import type { VehicleType } from '@/types'
import { HMRC_RATES } from '@/types'

/**
 * Get UK tax year string from a date.
 * UK tax year runs April 6 to April 5.
 * e.g. 2025-04-06 → "2025-26", 2025-04-05 → "2024-25"
 */
export function getTaxYear(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // 1-indexed
  const day = date.getDate()

  // April 6 onwards = current year's tax year
  if (month > 4 || (month === 4 && day >= 6)) {
    const nextYear = (year + 1) % 100
    return `${year}-${String(nextYear).padStart(2, '0')}`
  }
  // Before April 6 = previous year's tax year
  const currentYearShort = year % 100
  return `${year - 1}-${String(currentYearShort).padStart(2, '0')}`
}

interface DeductibleResult {
  amount: number
  breakdown: string
  rateApplied: number // effective pence per mile (for display)
  crossesThreshold: boolean
}

/**
 * Calculate HMRC mileage deductible with tiered rates.
 *
 * For car/van: 45p first 10k miles per tax year, then 25p.
 * For motorcycle: flat 24p.
 * For bicycle: flat 20p.
 */
export function calculateDeductible(
  miles: number,
  vehicleType: VehicleType,
  cumulativeMilesBefore: number
): DeductibleResult {
  const rate = HMRC_RATES[vehicleType]

  // Flat rate vehicles (motorcycle, bicycle)
  if (rate.second === null || rate.threshold === null) {
    const amount = miles * rate.first
    return {
      amount: Math.round(amount * 100) / 100,
      breakdown: `${miles} miles @ ${(rate.first * 100).toFixed(0)}p/mile`,
      rateApplied: rate.first * 100,
      crossesThreshold: false,
    }
  }

  const threshold = rate.threshold
  const cumulativeAfter = cumulativeMilesBefore + miles

  // Case 1: All miles at first rate (under threshold)
  if (cumulativeAfter <= threshold) {
    const amount = miles * rate.first
    return {
      amount: Math.round(amount * 100) / 100,
      breakdown: `${miles} miles @ ${(rate.first * 100).toFixed(0)}p/mile`,
      rateApplied: rate.first * 100,
      crossesThreshold: false,
    }
  }

  // Case 2: All miles at second rate (already over threshold)
  if (cumulativeMilesBefore >= threshold) {
    const amount = miles * rate.second
    return {
      amount: Math.round(amount * 100) / 100,
      breakdown: `${miles} miles @ ${(rate.second * 100).toFixed(0)}p/mile (over ${threshold.toLocaleString()} mile threshold)`,
      rateApplied: rate.second * 100,
      crossesThreshold: false,
    }
  }

  // Case 3: Split — this journey crosses the threshold
  const firstRateMiles = threshold - cumulativeMilesBefore
  const secondRateMiles = miles - firstRateMiles
  const amount = (firstRateMiles * rate.first) + (secondRateMiles * rate.second)

  return {
    amount: Math.round(amount * 100) / 100,
    breakdown: `${firstRateMiles} miles @ ${(rate.first * 100).toFixed(0)}p + ${secondRateMiles.toFixed(1)} miles @ ${(rate.second * 100).toFixed(0)}p (crosses ${threshold.toLocaleString()} mile threshold)`,
    rateApplied: rate.first * 100, // show first rate as primary
    crossesThreshold: true,
  }
}
