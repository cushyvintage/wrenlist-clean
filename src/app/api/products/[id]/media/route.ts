/**
 * GET /api/products/[id]/media?marketplace=vinted&limit=16
 * Returns photo data for a find in the format expected by the wrenlist Chrome extension.
 * The server fetches each image URL and returns base64 data URLs so the extension
 * can use them regardless of CDN auth/CORS restrictions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type RouteParams = Promise<{ id: string }>

const fetchWithTimeout = async (url: string, timeoutMs = 10000): Promise<Response> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

export async function GET(request: NextRequest, { params }: { params: RouteParams }) {
  const { id } = await params

  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: find, error: findError } = await supabase
      .from('finds')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (findError || !find) {
      return NextResponse.json({ error: 'Find not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '16', 10), 50)

    const allPhotos: string[] = Array.isArray(find.photos) ? find.photos : []
    const photos = allPhotos.slice(0, limit)

    if (photos.length === 0) {
      return NextResponse.json([])
    }

    // Server-side fetch: convert each CDN URL to a base64 data URL.
    // This allows the extension to use images from any CDN (Vinted, eBay, etc.)
    // without CORS or auth restrictions, since the fetch happens server-side.
    const mediaPromises = photos.map(async (imageUrl: string, index: number) => {
      try {
        const imageResponse = await fetchWithTimeout(imageUrl, 10000)
        if (!imageResponse.ok) {
          throw new Error(`HTTP ${imageResponse.status}`)
        }

        const arrayBuffer = await imageResponse.arrayBuffer()
        if (arrayBuffer.byteLength === 0) throw new Error('Empty response')

        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
        const buffer = Buffer.from(arrayBuffer)
        const base64 = buffer.toString('base64')
        const dataUrl = `data:${contentType};base64,${base64}`

        // Extract filename
        let filename = `photo-${index + 1}.jpg`
        try {
          const urlWithoutQuery = imageUrl.split('?')[0] ?? ''
          const extracted = urlWithoutQuery.split('/').pop()
          if (extracted && extracted.includes('.')) filename = extracted
        } catch {
          // use default
        }

        return { url: dataUrl, name: filename }
      } catch (error) {
        console.error(`[Media API] Failed to fetch image ${index + 1} (${imageUrl.substring(0, 80)}...):`, error)
        return null
      }
    })

    const results = await Promise.all(mediaPromises)
    const media = results.filter((item): item is { url: string; name: string } => item !== null)

    return NextResponse.json(media)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`GET /api/products/${id}/media error:`, error)
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
