import { NextRequest } from 'next/server'
import { supabase, getAuthUser } from '@/services/supabase'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * POST /api/listings/delist-all
 * Delist a find from all platforms (when it sells on one)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const body = await request.json()
    const { findId } = body

    if (!findId) {
      return ApiResponseHelper.badRequest('findId is required')
    }

    // Verify find belongs to user
    const { data: find } = await supabase
      .from('finds')
      .select('id')
      .eq('id', findId)
      .eq('user_id', user.id)
      .single()

    if (!find) {
      return ApiResponseHelper.notFound('Find not found')
    }

    // Get all active listings for this find
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('*')
      .eq('find_id', findId)
      .eq('user_id', user.id)
      .neq('status', 'delisted')

    if (listingsError) {
      console.error('Supabase error fetching listings:', listingsError)
      return ApiResponseHelper.internalError(listingsError.message)
    }

    if (!listings || listings.length === 0) {
      return ApiResponseHelper.success({ message: 'No listings to delist', delistedCount: 0 })
    }

    // Update all listings to delisted status
    const { error: updateError } = await supabase
      .from('listings')
      .update({
        status: 'delisted',
        delisted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('find_id', findId)
      .eq('user_id', user.id)
      .neq('status', 'delisted')

    if (updateError) {
      console.error('Supabase error delisting:', updateError)
      return ApiResponseHelper.internalError(updateError.message)
    }

    return ApiResponseHelper.success({
      message: `Delisted ${listings.length} listings`,
      delistedCount: listings.length,
      platforms: [...new Set(listings.map((l) => l.platform))],
    })
  } catch (error) {
    console.error('POST /api/listings/delist-all error:', error)
    return ApiResponseHelper.internalError()
  }
}
