import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import type { Listing } from '@/types'

/**
 * POST /api/listings/create
 * Create a listing for a find on a specific marketplace
 * Body: { findId, platform }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const body = await request.json()
    const { findId, platform } = body

    if (!findId || !platform) {
      return ApiResponseHelper.badRequest('findId and platform are required')
    }

    // Verify find exists and belongs to user
    const { data: find } = await supabase
      .from('finds')
      .select('*')
      .eq('id', findId)
      .eq('user_id', user.id)
      .single()

    if (!find) {
      return ApiResponseHelper.notFound('Find not found')
    }

    // Create listing record
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert([
        {
          find_id: findId,
          user_id: user.id,
          platform,
          status: 'draft',
          listed_at: new Date().toISOString(),
          views: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single()

    if (listingError) {
      console.error('Supabase error creating listing:', listingError)
      return ApiResponseHelper.internalError(listingError.message)
    }

    return ApiResponseHelper.created(listing as Listing)
  } catch (error) {
    console.error('POST /api/listings/create error:', error)
    return ApiResponseHelper.internalError()
  }
}
