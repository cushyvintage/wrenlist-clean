import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import type { SourcingTrip, SourcingTripWithStats } from '@/types'

/**
 * GET /api/sourcing
 * Fetch all sourcing trips for the authenticated user with stats
 * Query params: limit?, offset?
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Fetch trips
    const { data: trips, error: tripsError, count } = await supabase
      .from('sourcing_trips')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (tripsError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', tripsError)
      }
      return ApiResponseHelper.internalError()
    }

    // For each trip, fetch stats (find count, total spend, potential revenue)
    const tripsWithStats: SourcingTripWithStats[] = await Promise.all(
      trips.map(async (trip) => {
        const { data: finds, error: findsError } = await supabase
          .from('finds')
          .select('cost_gbp, asking_price_gbp')
          .eq('sourcing_trip_id', trip.id)

        if (findsError) {
          console.error('Error fetching finds for trip:', findsError)
          return {
            ...trip,
            find_count: 0,
            total_spent_gbp: 0,
            total_potential_revenue_gbp: 0,
            roi_multiplier: null,
          }
        }

        const find_count = finds?.length || 0
        const total_spent_gbp = (finds || []).reduce((sum, f) => sum + (f.cost_gbp || 0), 0)
        const total_potential_revenue_gbp = (finds || []).reduce((sum, f) => sum + (f.asking_price_gbp || 0), 0)

        // Calculate trip cost (entry fee + mileage deductible)
        const mileageDeductible = (trip.miles || 0) * 0.45
        const tripCostGbp = (trip.entry_fee_gbp || 0) + mileageDeductible
        const totalCostGbp = total_spent_gbp + tripCostGbp

        const roi_multiplier = totalCostGbp > 0 ? total_potential_revenue_gbp / totalCostGbp : null

        return {
          ...trip,
          find_count,
          total_spent_gbp,
          total_potential_revenue_gbp,
          roi_multiplier,
        }
      })
    )

    return ApiResponseHelper.success({
      data: tripsWithStats,
      pagination: { limit, offset, total: count || 0 },
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('GET /api/sourcing error:', error)
    }
    return ApiResponseHelper.internalError()
  }
}

/**
 * POST /api/sourcing
 * Create a new sourcing trip
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    const { name, type, location, date, miles, entry_fee_gbp, notes, supplier_id } = body

    // Validate required fields
    if (!name || !type || !date) {
      return ApiResponseHelper.badRequest('Missing required fields: name, type, date')
    }

    const trip = {
      user_id: user.id,
      name,
      type,
      location: location || null,
      date,
      miles: miles ? parseFloat(miles) : null,
      entry_fee_gbp: entry_fee_gbp ? parseFloat(entry_fee_gbp) : null,
      notes: notes || null,
      supplier_id: supplier_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('sourcing_trips')
      .insert([trip])
      .select('*')
      .single()

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', error)
      }
      return ApiResponseHelper.internalError()
    }

    return ApiResponseHelper.created(data as SourcingTrip)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('POST /api/sourcing error:', error)
    }
    return ApiResponseHelper.internalError()
  }
}
