import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { findToExtensionProduct } from '@/lib/find-to-product'
import type { Find } from '@/types'

/**
 * GET /api/chrome-extension/vinted/product-payload/[findId]
 * Fetches a Find from the platform and converts it to ExtensionProduct format
 * for the Vinted extension to use directly
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ findId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const { findId } = await params

    // Fetch the find
    const { data: find, error } = await supabase
      .from('finds')
      .select('*')
      .eq('id', findId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return ApiResponseHelper.notFound()
      }
      console.error('Supabase error:', error)
      return ApiResponseHelper.internalError()
    }

    if (!find) {
      return ApiResponseHelper.notFound()
    }

    // Convert Find to ExtensionProduct format
    const product = findToExtensionProduct(find as Find)

    return ApiResponseHelper.success({
      success: true,
      product,
    })
  } catch (error) {
    console.error('GET /api/chrome-extension/vinted/product-payload error:', error)
    return ApiResponseHelper.internalError()
  }
}
