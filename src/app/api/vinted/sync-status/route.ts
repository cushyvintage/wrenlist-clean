import { NextRequest } from 'next/server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/api-helpers'
import type { FindStatus } from '@/types'

interface VintedStatusUpdate {
  product_id: string // find.id
  vinted_product_id: string // vinted listing ID
  vinted_status: 'active' | 'sold' | 'hidden' | string
  last_synced_at: string
  price?: number
  favourites?: number
  views?: number
}

interface SyncStatusResult {
  updated: number
  failed: number
  errorDetails?: Array<{ findId: string; reason: string }>
}

/**
 * Map Vinted status to Find status
 */
function mapVintedStatusToFindStatus(vintedStatus: string): FindStatus {
  const statusMap: Record<string, FindStatus> = {
    active: 'listed',
    sold: 'sold',
    hidden: 'on_hold',
  }
  return statusMap[vintedStatus] || 'listed'
}

/**
 * POST /api/vinted/sync-status
 * Sync Vinted listing status updates back to finds
 */
export async function POST(req: NextRequest) {
  return withAuth(req, async (req, user, supabase) => {
  try {
    const body = await req.json()
    const { updates } = body as { updates: VintedStatusUpdate[] }

    if (!Array.isArray(updates) || updates.length === 0) {
      return ApiResponseHelper.badRequest('updates array is required and must not be empty')
    }
    let updated = 0
    let failed = 0
    const errorDetails: Array<{ findId: string; reason: string }> = []

    // Process each status update
    for (const update of updates) {
      try {
        if (!update.product_id || !update.vinted_status) {
          failed++
          errorDetails.push({ findId: update.product_id || 'unknown', reason: 'Missing required fields' })
          continue
        }

        // Map Vinted status to Find status
        const findStatus = mapVintedStatusToFindStatus(update.vinted_status)

        // Update the find
        const { error: updateError } = await supabase
          .from('finds')
          .update({
            status: findStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', update.product_id)
          .eq('user_id', user.id)

        if (updateError) {
          throw updateError
        }

        updated++
      } catch (err) {
        failed++
        const reason = err instanceof Error ? err.message : 'Unknown error'
        errorDetails.push({ findId: update.product_id || 'unknown', reason })
      }
    }

    const result: SyncStatusResult = {
      updated,
      failed,
      ...(errorDetails.length > 0 && { errorDetails }),
    }

    return ApiResponseHelper.success(result)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('POST /api/vinted/sync-status error:', error)
    }
    return ApiResponseHelper.internalError()
  }
  })
}
