import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import type { Listing } from '@/types'

/**
 * POST /api/listings/[id]/sync
 * Sync listing with marketplace API (update views, likes, etc.)
 */
export async function POST(__request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    // Verify listing belongs to user
    const { data: listing, error: checkError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (checkError || !listing) {
      return ApiResponseHelper.notFound()
    }

    // In production, would sync with marketplace APIs
    // Mock sync: just update the updated_at timestamp
    const { data, error } = await supabase
      .from('listings')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Supabase error syncing:', error)
      return ApiResponseHelper.internalError(error.message)
    }

    // In production would be:
    // const syncedData = await getMarketplaceService(listing.platform).getListingDetails(
    //   listing.platform_listing_id
    // )
    // Update with: views, likes, messages, status, etc.

    return ApiResponseHelper.success(data as Listing)
  } catch (error) {
    console.error('POST /api/listings/[id]/sync error:', error)
    return ApiResponseHelper.internalError()
  }
}
