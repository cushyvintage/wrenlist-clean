/**
 * Mileage management service
 * Handles CRUD operations for business mileage tracking and HMRC calculations
 */

import { supabase, getAuthUser } from './supabase'
import type { Mileage, MileagePurpose } from '@/types'
import { HMRC_MILEAGE_RATE } from '@/types'

/**
 * Create a new mileage record
 */
export async function createMileage(data: {
  date: string
  miles: number
  purpose: MileagePurpose
  from_location?: string | null
  to_location?: string | null
  vehicle: string
}): Promise<Mileage> {
  const user = await getAuthUser()
  if (!user) throw new Error('Unauthorized')

  const deductible_value_gbp = data.miles * HMRC_MILEAGE_RATE

  const { data: mileage, error } = await supabase
    .from('mileage')
    .insert({
      user_id: user.id,
      ...data,
      deductible_value_gbp,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) throw error
  return mileage as Mileage
}

/**
 * Get all mileage records for current user
 */
export async function getMileage(filters?: {
  vehicle?: string
  purpose?: MileagePurpose
  from_date?: string
  to_date?: string
}): Promise<Mileage[]> {
  const user = await getAuthUser()
  if (!user) throw new Error('Unauthorized')

  let query = supabase
    .from('mileage')
    .select('*')
    .eq('user_id', user.id)

  if (filters?.vehicle) {
    query = query.eq('vehicle', filters.vehicle)
  }

  if (filters?.purpose) {
    query = query.eq('purpose', filters.purpose)
  }

  if (filters?.from_date) {
    query = query.gte('date', filters.from_date)
  }

  if (filters?.to_date) {
    query = query.lte('date', filters.to_date)
  }

  const { data, error } = await query.order('date', { ascending: false })

  if (error) throw error
  return (data || []) as Mileage[]
}

/**
 * Get a single mileage record by ID
 */
export async function getMileageById(id: string): Promise<Mileage> {
  const user = await getAuthUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('mileage')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) throw error
  return data as Mileage
}

/**
 * Update a mileage record
 */
export async function updateMileage(
  id: string,
  data: Partial<Omit<Mileage, 'id' | 'user_id' | 'created_at'>>
): Promise<Mileage> {
  const user = await getAuthUser()
  if (!user) throw new Error('Unauthorized')

  // Recalculate deductible value if miles changed
  let updateData = { ...data, updated_at: new Date().toISOString() }
  if (data.miles !== undefined) {
    ;(updateData as any).deductible_value_gbp = data.miles * HMRC_MILEAGE_RATE
  }

  const { data: updated, error } = await supabase
    .from('mileage')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error) throw error
  return updated as Mileage
}

/**
 * Delete a mileage record
 */
export async function deleteMileage(id: string): Promise<void> {
  const user = await getAuthUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('mileage')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

/**
 * Get mileage summary for tax year
 */
export async function getMileageSummary(fromDate: string, toDate: string) {
  const user = await getAuthUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('mileage')
    .select('miles, vehicle, purpose, deductible_value_gbp')
    .eq('user_id', user.id)
    .gte('date', fromDate)
    .lte('date', toDate)

  if (error) throw error

  const summary = {
    total_miles: 0,
    total_deductible_value: 0,
    trip_count: 0,
    by_vehicle: {} as Record<string, { miles: number; trips: number; value: number }>,
    by_purpose: {} as Record<MileagePurpose, { miles: number; trips: number; value: number }>,
  }

  ;(data || []).forEach((record: any) => {
    summary.total_miles += record.miles
    summary.total_deductible_value += record.deductible_value_gbp
    summary.trip_count += 1

    // By vehicle
    if (!summary.by_vehicle[record.vehicle]) {
      summary.by_vehicle[record.vehicle] = { miles: 0, trips: 0, value: 0 }
    }
    summary.by_vehicle[record.vehicle].miles += record.miles
    summary.by_vehicle[record.vehicle].trips += 1
    summary.by_vehicle[record.vehicle].value += record.deductible_value_gbp

    // By purpose
    if (!summary.by_purpose[record.purpose]) {
      summary.by_purpose[record.purpose] = { miles: 0, trips: 0, value: 0 }
    }
    summary.by_purpose[record.purpose].miles += record.miles
    summary.by_purpose[record.purpose].trips += 1
    summary.by_purpose[record.purpose].value += record.deductible_value_gbp
  })

  return summary
}

/**
 * Get unique vehicles for current user
 */
export async function getVehicles(): Promise<string[]> {
  const user = await getAuthUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('mileage')
    .select('vehicle')
    .eq('user_id', user.id)
    .order('vehicle')
    .limit(100)

  if (error) throw error

  // Get unique vehicles
  const vehicles = [...new Set((data || []).map((r: any) => r.vehicle))]
  return vehicles.sort()
}
