import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * Etsy bulk operations API route.
 *
 * This endpoint validates and logs bulk operation requests. The actual
 * execution happens via the Chrome extension which calls Etsy's internal
 * AJAX API (cookie + CSRF auth). The webapp sends the operation params
 * to the extension via chrome.runtime.sendMessage from the client.
 *
 * This route exists for:
 * 1. Input validation before extension messaging
 * 2. Future audit logging
 * 3. Potential server-side orchestration if needed
 */

type BulkOperation =
  | 'update_price'
  | 'renew'
  | 'deactivate'
  | 'update_tags'
  | 'patch'
  | 'delete'

interface BulkPriceItem {
  listingId: string
  price: number
}

interface BulkTagItem {
  listingId: string
  tags: string[]
}

interface BulkPatchItem {
  listingId: string
  fields: Record<string, unknown>
}

interface BulkRequestBody {
  operation: BulkOperation
  items?: BulkPriceItem[] | BulkTagItem[] | BulkPatchItem[]
  listingIds?: string[]
}

function validateRequest(body: BulkRequestBody): string | null {
  if (!body.operation) return 'operation is required'

  const validOps: BulkOperation[] = ['update_price', 'renew', 'deactivate', 'update_tags', 'patch', 'delete']
  if (!validOps.includes(body.operation)) {
    return `Invalid operation. Must be one of: ${validOps.join(', ')}`
  }

  switch (body.operation) {
    case 'update_price': {
      if (!Array.isArray(body.items) || body.items.length === 0) return 'items array required'
      for (const item of body.items as BulkPriceItem[]) {
        if (!item.listingId) return 'Each item must have a listingId'
        if (typeof item.price !== 'number' || item.price <= 0) return 'Each item must have a positive price'
      }
      break
    }
    case 'renew':
    case 'deactivate':
    case 'delete': {
      if (!Array.isArray(body.listingIds) || body.listingIds.length === 0) return 'listingIds array required'
      break
    }
    case 'update_tags': {
      if (!Array.isArray(body.items) || body.items.length === 0) return 'items array required'
      for (const item of body.items as BulkTagItem[]) {
        if (!item.listingId) return 'Each item must have a listingId'
        if (!Array.isArray(item.tags)) return 'Each item must have a tags array'
      }
      break
    }
    case 'patch': {
      if (!Array.isArray(body.items) || body.items.length === 0) return 'items array required'
      for (const item of body.items as BulkPatchItem[]) {
        if (!item.listingId) return 'Each item must have a listingId'
        if (!item.fields || typeof item.fields !== 'object') return 'Each item must have a fields object'
      }
      break
    }
  }

  return null
}

/**
 * POST /api/etsy/bulk-operations
 *
 * Validates bulk operation request and returns the extension message
 * payload that the client should send to the extension.
 */
export const POST = withAuth(async (req: NextRequest) => {
  const body = (await req.json()) as BulkRequestBody

  const error = validateRequest(body)
  if (error) {
    return ApiResponseHelper.error(error, 400)
  }

  // Map operation to extension message action + params
  const extensionMessage: Record<string, unknown> = {}

  switch (body.operation) {
    case 'update_price':
      extensionMessage.action = 'etsy_bulk_update_price'
      extensionMessage.items = body.items
      break
    case 'renew':
      extensionMessage.action = 'etsy_bulk_renew'
      extensionMessage.listingIds = body.listingIds
      break
    case 'deactivate':
      extensionMessage.action = 'etsy_bulk_deactivate'
      extensionMessage.listingIds = body.listingIds
      break
    case 'update_tags':
      extensionMessage.action = 'etsy_bulk_update_tags'
      extensionMessage.items = body.items
      break
    case 'patch':
      extensionMessage.action = 'etsy_bulk_patch'
      extensionMessage.items = body.items
      break
    case 'delete':
      extensionMessage.action = 'etsy_bulk_delete'
      extensionMessage.listingIds = body.listingIds
      break
  }

  const itemCount = body.listingIds?.length ?? (body.items as unknown[])?.length ?? 0

  return ApiResponseHelper.success({
    operation: body.operation,
    itemCount,
    extensionMessage,
    message: `Validated ${body.operation} for ${itemCount} listings. Send extensionMessage to the extension.`,
  })
})
