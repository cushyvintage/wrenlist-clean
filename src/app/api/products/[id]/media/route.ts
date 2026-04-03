/**
 * GET /api/products/[id]/media?marketplace=vinted
 * Returns photo URLs for a find in the format expected by the wrenlist Chrome extension.
 * Extension fetches each URL, converts to File[], then uploads to the target marketplace.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getFind } from '@/services/products.service'

type RouteParams = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: RouteParams }) {
  const { id } = await params

  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const find = await getFind(id, user.id)

    if (!find) {
      return NextResponse.json({ error: 'Find not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const photos: string[] = Array.isArray(find!.photos) ? find!.photos : []

    // Return array of { url, name } as expected by the extension's getProductMediaForMarketplace()
    const media = photos.map((url: string, index: number) => {
      const urlWithoutQuery = url.includes('?') ? url.substring(0, url.indexOf('?')) : url
      const extMatch = urlWithoutQuery.match(/\.([a-z0-9]+)$/i)
      const ext: string = (extMatch && extMatch[1]) ? (extMatch[1] as string) : 'jpg'
      return {
        url,
        name: `photo-${index + 1}.${ext}`,
      }
    })

    return NextResponse.json(media)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`GET /api/products/${id}/media error:`, error)
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
