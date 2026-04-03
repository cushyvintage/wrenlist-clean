import { NextRequest } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * POST /api/ai/remove-background
 * Remove background from a photo using remove.bg API
 *
 * Request: { photoUrl: string }
 * Response: { url: string } | error
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const { photoUrl } = await request.json() as { photoUrl?: string }

    if (!photoUrl || typeof photoUrl !== 'string') {
      return ApiResponseHelper.badRequest('photoUrl is required')
    }

    const removeDbApiKey = process.env.REMOVE_BG_API_KEY
    if (!removeDbApiKey) {
      return ApiResponseHelper.badRequest(
        JSON.stringify({
          success: false,
          error: 'Background removal API not configured',
          apiKeyMissing: true,
        })
      )
    }

    const formData = new FormData()
    formData.append('image_url', photoUrl)
    formData.append('format', 'auto')
    formData.append('type', 'auto')
    formData.append('scale', '100%')

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-API-Key': removeDbApiKey,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      if (process.env.NODE_ENV !== 'production') {
        console.error('remove.bg error:', error)
      }
      return ApiResponseHelper.badRequest('Failed to remove background')
    }

    const imageBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(imageBuffer).toString('base64')
    const dataUrl = `data:image/png;base64,${base64}`

    return ApiResponseHelper.success({
      url: dataUrl,
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('POST /api/ai/remove-background error:', error)
    }
    return ApiResponseHelper.internalError()
  }
}
