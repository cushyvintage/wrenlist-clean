import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import type { SourcingTrip, SourcingTripWithStats } from '@/types'

/**
 * GET /api/sourcing
 * Fetch all sourcing trips for the authenticated user with stats
 * Query params: limit?, offset?
 */
export const GET = withAuth(async (req, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(req.url)
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

    return ApiResponseHelper.success(tripsWithStats)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('GET /api/sourcing error:', error)
    }
    return ApiResponseHelper.internalError()
  }
})

/**
 * POST /api/sourcing
 * Create a new sourcing trip
 */
export const POST = withAuth(async (req, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const body = await req.json()

    const { name, type, location, date, miles, entry_fee_gbp, notes } = body

    // Validate required fields
    if (!name || !type || !date) {
      return ApiResponseHelper.badRequest('Missing required fields: name, type, date')
    }

    // NOTE: supplier_id used to be a column on sourcing_trips but was
    // removed at some point without updating this handler. Writing it
    // caused every POST to 500 with "column does not exist". The client
    // still sends supplier_id in the form body — we just ignore it here.
    // If supplier tracking comes back it should live on `suppliers` via a
    // trip → supplier pivot, not a nullable FK on the trip itself.
    const trip = {
      user_id: user.id,
      name,
      type,
      location: location || null,
      date,
      miles: miles ? parseFloat(miles) : null,
      entry_fee_gbp: entry_fee_gbp ? parseFloat(entry_fee_gbp) : null,
      notes: notes || null,
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
})
