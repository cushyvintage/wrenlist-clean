import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { CreateMileageSchema, validateBody } from '@/lib/validation'
import { getTaxYear, calculateDeductible } from '@/lib/mileage-calc'
import type { Mileage, VehicleType } from '@/types'

/**
 * GET /api/mileage
 * Fetch all mileage entries for the authenticated user
 * Query params: start_date?, end_date?, limit?, offset?
 */
export const GET = withAuth(async (req, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('mileage')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (startDate) {
      query = query.gte('date', startDate)
    }

    if (endDate) {
      query = query.lte('date', endDate)
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      if (process.env.NODE_ENV !== 'production') { console.error('Supabase error:', error) }
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success({
      data: data as Mileage[],
      pagination: {
        limit,
        offset,
        total: count || 0,
      },
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') { console.error('GET /api/mileage error:', error) }
    return ApiResponseHelper.internalError()
  }
})

/**
 * POST /api/mileage
 * Create a new mileage entry with HMRC tiered rate calculation
 */
export const POST = withAuth(async (req, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const body = await req.json()

    const validation = validateBody(CreateMileageSchema, body)
    if (!validation.success) {
      return ApiResponseHelper.badRequest(validation.error)
    }

    const date = validation.data.date ?? new Date().toISOString().split('T')[0]!
    const vehicleType = (validation.data.vehicle_type || 'car') as VehicleType
    const taxYear = getTaxYear(date)

    // Query cumulative miles for this user + vehicle type + tax year (before this trip)
    const { data: cumulativeData, error: cumError } = await supabase
      .from('mileage')
      .select('miles')
      .eq('user_id', user.id)
      .eq('vehicle_type', vehicleType)
      .eq('tax_year', taxYear)

    if (cumError) {
      if (process.env.NODE_ENV !== 'production') { console.error('Cumulative query error:', cumError) }
      return ApiResponseHelper.internalError(cumError.message)
    }

    const cumulativeMilesBefore = (cumulativeData || []).reduce(
      (sum: number, row: { miles: number }) => sum + Number(row.miles), 0
    )

    const { amount } = calculateDeductible(
      validation.data.miles,
      vehicleType,
      cumulativeMilesBefore
    )

    const mileage = {
      user_id: user.id,
      date,
      miles: validation.data.miles,
      purpose: validation.data.purpose || 'sourcing',
      from_location: validation.data.from_location || null,
      to_location: validation.data.to_location || null,
      vehicle: validation.data.vehicle,
      vehicle_type: vehicleType,
      tax_year: taxYear,
      deductible_value_gbp: amount,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('mileage')
      .insert([mileage])
      .select('*')
      .single()

    if (error) {
      if (process.env.NODE_ENV !== 'production') { console.error('Supabase error:', error) }
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.created(data as Mileage)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') { console.error('POST /api/mileage error:', error) }
    return ApiResponseHelper.internalError()
  }
})
