import { NextRequest } from 'next/server'
import { supabase, getAuthUser } from '@/services/supabase'
import { ApiResponseHelper } from '@/lib/api-response'
import type { Listing } from '@/types'

/**
 * POST /api/listings/[id]/delist
 * Delist a listing from a single platform
 */
export async function POST(__request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getAuthUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

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

    // Mark as delisted
    const { data, error } = await supabase
      .from('listings')
      .update({
        status: 'delisted',
        delisted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Supabase error delisting:', error)
      return ApiResponseHelper.internalError(error.message)
    }

    // In production, would call marketplace API to delist
    // e.g., VintedService.deleteListing(listing.platform_listing_id)

    return ApiResponseHelper.success(data as Listing)
  } catch (error) {
    console.error('POST /api/listings/[id]/delist error:', error)
    return ApiResponseHelper.internalError()
  }
}
