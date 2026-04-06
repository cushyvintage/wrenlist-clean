import type { VehicleType, MileageRate } from '@/types'
import { HMRC_RATES } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

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

/**
 * Fetch HMRC rates from the database for a specific tax year and vehicle type.
 * Falls back to the in-memory HMRC_RATES constant if no DB row found.
 */
export async function getRatesForTaxYear(
  supabase: SupabaseClient,
  taxYear: string,
  vehicleType: VehicleType
): Promise<MileageRate> {
  const { data, error } = await supabase
    .from('hmrc_mileage_rates')
    .select('first_rate_pence, second_rate_pence, threshold_miles')
    .eq('tax_year', taxYear)
    .eq('vehicle_type', vehicleType)
    .single()

  if (error || !data) {
    // Fallback to constant if no DB row (e.g. future tax year not yet seeded)
    return HMRC_RATES[vehicleType]
  }

  return {
    first: data.first_rate_pence / 100,
    second: data.second_rate_pence != null ? data.second_rate_pence / 100 : null,
    threshold: data.threshold_miles,
  }
}

interface DeductibleResult {
  amount: number
  breakdown: string
  rateApplied: number // effective pence per mile (for display)
  crossesThreshold: boolean
}

/**
 * Calculate HMRC mileage deductible with tiered rates.
 * Accepts rates as a parameter — caller fetches from DB via getRatesForTaxYear().
 */
export function calculateDeductible(
  miles: number,
  vehicleType: VehicleType,
  cumulativeMilesBefore: number,
  rate?: MileageRate
): DeductibleResult {
  const r = rate ?? HMRC_RATES[vehicleType]

  // Flat rate vehicles (motorcycle, bicycle)
  if (r.second === null || r.threshold === null) {
    const amount = miles * r.first
    return {
      amount: Math.round(amount * 100) / 100,
      breakdown: `${miles} miles @ ${(r.first * 100).toFixed(0)}p/mile`,
      rateApplied: r.first * 100,
      crossesThreshold: false,
    }
  }

  const threshold = r.threshold
  const cumulativeAfter = cumulativeMilesBefore + miles

  // Case 1: All miles at first rate (under threshold)
  if (cumulativeAfter <= threshold) {
    const amount = miles * r.first
    return {
      amount: Math.round(amount * 100) / 100,
      breakdown: `${miles} miles @ ${(r.first * 100).toFixed(0)}p/mile`,
      rateApplied: r.first * 100,
      crossesThreshold: false,
    }
  }

  // Case 2: All miles at second rate (already over threshold)
  if (cumulativeMilesBefore >= threshold) {
    const amount = miles * r.second
    return {
      amount: Math.round(amount * 100) / 100,
      breakdown: `${miles} miles @ ${(r.second * 100).toFixed(0)}p/mile (over ${threshold.toLocaleString()} mile threshold)`,
      rateApplied: r.second * 100,
      crossesThreshold: false,
    }
  }

  // Case 3: Split — this journey crosses the threshold
  const firstRateMiles = threshold - cumulativeMilesBefore
  const secondRateMiles = miles - firstRateMiles
  const amount = (firstRateMiles * r.first) + (secondRateMiles * r.second)

  return {
    amount: Math.round(amount * 100) / 100,
    breakdown: `${firstRateMiles} miles @ ${(r.first * 100).toFixed(0)}p + ${secondRateMiles.toFixed(1)} miles @ ${(r.second * 100).toFixed(0)}p (crosses ${threshold.toLocaleString()} mile threshold)`,
    rateApplied: r.first * 100,
    crossesThreshold: true,
  }
}
