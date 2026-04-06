import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { UpdateMileageSchema, validateBody } from '@/lib/validation'
import { getTaxYear, calculateDeductible, getRatesForTaxYear } from '@/lib/mileage-calc'
import type { Mileage, VehicleType } from '@/types'

/**
 * GET /api/mileage/[id]
 * Fetch a single mileage entry by ID
 */
export async function GET(__request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('mileage')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return ApiResponseHelper.notFound()
      }
      if (process.env.NODE_ENV !== 'production')  { console.error('Supabase error:', error) }      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success(data as Mileage)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production')  { console.error('GET /api/mileage/[id] error:', error) }    return ApiResponseHelper.internalError()
  }
}

/**
 * PATCH /api/mileage/[id]
 * Update a mileage entry
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    // Validate request body
    const validation = validateBody(UpdateMileageSchema, body)
    if (!validation.success) {
      return ApiResponseHelper.badRequest(validation.error)
    }

    // Ensure user owns this mileage entry
    const { data: existing, error: checkError } = await supabase
      .from('mileage')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existing) {
      return ApiResponseHelper.notFound()
    }

    // If miles, vehicle_type, or date changed, recalculate deductible
    const updateData: Record<string, unknown> = {
      ...validation.data,
      updated_at: new Date().toISOString(),
    }

    if (validation.data.miles || validation.data.vehicle_type || validation.data.date) {
      // Fetch full current record to merge with updates
      const { data: current } = await supabase
        .from('mileage')
        .select('*')
        .eq('id', id)
        .single()

      if (current) {
        const miles = validation.data.miles ?? current.miles
        const vehicleType = (validation.data.vehicle_type ?? current.vehicle_type) as VehicleType
        const date = validation.data.date ?? current.date
        const taxYear = getTaxYear(date)

        // Get cumulative miles excluding this record
        const { data: cumData } = await supabase
          .from('mileage')
          .select('miles')
          .eq('user_id', user.id)
          .eq('vehicle_type', vehicleType)
          .eq('tax_year', taxYear)
          .neq('id', id)

        const cumulativeBefore = (cumData || []).reduce(
          (sum: number, row: { miles: number }) => sum + Number(row.miles), 0
        )

        const rate = await getRatesForTaxYear(supabase, taxYear, vehicleType)
        const { amount } = calculateDeductible(miles, vehicleType, cumulativeBefore, rate)
        updateData.deductible_value_gbp = amount
        updateData.tax_year = taxYear
      }
    }

    // Update mileage entry
    const { data, error } = await supabase
      .from('mileage')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      if (process.env.NODE_ENV !== 'production')  { console.error('Supabase error:', error) }      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success(data as Mileage)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production')  { console.error('PATCH /api/mileage/[id] error:', error) }    return ApiResponseHelper.internalError()
  }
}

/**
 * DELETE /api/mileage/[id]
 * Delete a mileage entry
 */
export async function DELETE(__request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    // Ensure user owns this mileage entry
    const { data: existing, error: checkError } = await supabase
      .from('mileage')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existing) {
      return ApiResponseHelper.notFound()
    }

    // Delete mileage entry
    const { error } = await supabase.from('mileage').delete().eq('id', id)

    if (error) {
      if (process.env.NODE_ENV !== 'production')  { console.error('Supabase error:', error) }      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success({ success: true })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production')  { console.error('DELETE /api/mileage/[id] error:', error) }    return ApiResponseHelper.internalError()
  }
}
