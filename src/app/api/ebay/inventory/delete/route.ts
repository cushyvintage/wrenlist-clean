import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { getEbayClientForUser } from '@/lib/ebay-client'
import { withAuth } from '@/lib/with-auth'

/**
 * DELETE /api/ebay/inventory/delete
 * Deletes eBay inventory items by SKU.
 * Body: { skus: string[] }
 */
export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json()
  const skus = body.skus as string[]

  if (!skus || !Array.isArray(skus) || skus.length === 0) {
    return ApiResponseHelper.badRequest('skus array required')
  }

  if (skus.length > 10) {
    return ApiResponseHelper.badRequest('Max 10 SKUs per request')
  }

  const supabase = await createSupabaseServerClient()

  let ebayClient
  try {
    ebayClient = await getEbayClientForUser(user.id, supabase, 'EBAY_GB')
  } catch {
    return ApiResponseHelper.badRequest('eBay not connected')
  }

  const results: Array<{ sku: string; success: boolean; status?: number; error?: string }> = []

  for (const sku of skus) {
    try {
      // Use rawApiRequest to handle 204 No Content (delete returns empty body)
      const response = await ebayClient.rawApiRequest(
        `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
        { method: 'DELETE' }
      )
      if (response.ok || response.status === 204) {
        results.push({ sku, success: true, status: response.status })
      } else {
        const error = await response.json().catch(() => ({ message: response.statusText })) as Record<string, unknown>
        const errors = error.errors as Array<Record<string, string>> | undefined
        const msg = errors?.[0]?.message || (error.message as string) || response.statusText
        results.push({ sku, success: false, status: response.status, error: msg })
      }
    } catch (err) {
      results.push({
        sku,
        success: false,
        error: err instanceof Error ? err.message : 'Delete failed',
      })
    }
  }

  const deleted = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  return ApiResponseHelper.success({ deleted, failed, results })
})
