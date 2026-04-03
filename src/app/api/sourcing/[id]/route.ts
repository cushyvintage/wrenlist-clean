import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import type { SourcingTrip, SourcingTripWithStats } from '@/types'

/**
 * GET /api/sourcing/[id]
 * Fetch a single sourcing trip with its finds
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const tripId = params.id

    // Fetch trip
    const { data: trip, error: tripError } = await supabase
      .from('sourcing_trips')
      .select('*')
      .eq('id', tripId)
      .eq('user_id', user.id)
      .single()

    if (tripError || !trip) {
      return ApiResponseHelper.notFound('Trip not found')
    }

    // Fetch finds for this trip
    const { data: finds, error: findsError } = await supabase
      .from('finds')
      .select('*')
      .eq('sourcing_trip_id', tripId)
      .order('created_at', { ascending: false })

    if (findsError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error fetching finds:', findsError)
      }
      return ApiResponseHelper.internalError()
    }

    // Calculate stats
    const find_count = finds?.length || 0
    const total_spent_gbp = (finds || []).reduce((sum, f) => sum + (f.cost_gbp || 0), 0)
    const total_potential_revenue_gbp = (finds || []).reduce((sum, f) => sum + (f.asking_price_gbp || 0), 0)

    const mileageDeductible = (trip.miles || 0) * 0.45
    const tripCostGbp = (trip.entry_fee_gbp || 0) + mileageDeductible
    const totalCostGbp = total_spent_gbp + tripCostGbp

    const roi_multiplier = totalCostGbp > 0 ? total_potential_revenue_gbp / totalCostGbp : null

    const tripWithStats: SourcingTripWithStats & { finds: any[] } = {
      ...trip,
      find_count,
      total_spent_gbp,
      total_potential_revenue_gbp,
      roi_multiplier,
      finds: finds || [],
    }

    return ApiResponseHelper.success(tripWithStats)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('GET /api/sourcing/[id] error:', error)
    }
    return ApiResponseHelper.internalError()
  }
}

/**
 * PATCH /api/sourcing/[id]
 * Update a sourcing trip
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const tripId = params.id
    const body = await request.json()

    // Verify ownership
    const { data: trip, error: tripError } = await supabase
      .from('sourcing_trips')
      .select('user_id')
      .eq('id', tripId)
      .single()

    if (tripError || !trip || trip.user_id !== user.id) {
      return ApiResponseHelper.notFound('Trip not found')
    }

    // Update trip
    const updateData = {
      ...body,
      miles: body.miles ? parseFloat(body.miles) : undefined,
      entry_fee_gbp: body.entry_fee_gbp ? parseFloat(body.entry_fee_gbp) : undefined,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('sourcing_trips')
      .update(updateData)
      .eq('id', tripId)
      .select('*')
      .single()

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', error)
      }
      return ApiResponseHelper.internalError()
    }

    return ApiResponseHelper.success(data as SourcingTrip)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('PATCH /api/sourcing/[id] error:', error)
    }
    return ApiResponseHelper.internalError()
  }
}

/**
 * DELETE /api/sourcing/[id]
 * Delete a sourcing trip (and unlink its finds)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const tripId = params.id

    // Verify ownership
    const { data: trip, error: tripError } = await supabase
      .from('sourcing_trips')
      .select('user_id')
      .eq('id', tripId)
      .single()

    if (tripError || !trip || trip.user_id !== user.id) {
      return ApiResponseHelper.notFound('Trip not found')
    }

    // Delete trip (finds will be unlinked due to ON DELETE SET NULL)
    const { error } = await supabase
      .from('sourcing_trips')
      .delete()
      .eq('id', tripId)

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', error)
      }
      return ApiResponseHelper.internalError()
    }

    return ApiResponseHelper.success({ message: 'Trip deleted' })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('DELETE /api/sourcing/[id] error:', error)
    }
    return ApiResponseHelper.internalError()
  }
}
