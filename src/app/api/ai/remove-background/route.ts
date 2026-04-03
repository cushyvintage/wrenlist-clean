import { NextRequest } from 'next/server'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * POST /api/ai/remove-background
 * DEPRECATED — Background removal now runs client-side using browser canvas
 * No longer needed — keeping as 501 stub for backwards compatibility
 */
export async function POST(_request: NextRequest) {
  return ApiResponseHelper.badRequest(
    'Background removal now runs client-side using browser canvas. No API call needed.'
  )
}
