import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * POST /api/ebay/disconnect
 *
 * Deletes eBay tokens and seller config for the user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const { marketplace = 'EBAY_GB' } = await request.json()

    // Delete tokens
    await supabase
      .from('ebay_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('marketplace_id', marketplace)

    // Delete seller config
    await supabase
      .from('ebay_seller_config')
      .delete()
      .eq('user_id', user.id)
      .eq('marketplace_id', marketplace)

    return ApiResponseHelper.success({
      success: true,
      message: 'eBay disconnected successfully',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to disconnect from eBay'
    return ApiResponseHelper.internalError(message)
  }
}
