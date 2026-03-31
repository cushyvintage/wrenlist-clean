import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import type { Listing } from '@/types'

/**
 * POST /api/listings/[id]/delist
 * Delist a listing from a single platform
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
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error delisting:', error)
      }
      return ApiResponseHelper.internalError()
    }

    // In production, would call marketplace API to delist
    // e.g., VintedService.deleteListing(listing.platform_listing_id)

    return ApiResponseHelper.success(data as Listing)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('POST /api/listings/[id]/delist error:', error)
    }
    return ApiResponseHelper.internalError()
  }
}
