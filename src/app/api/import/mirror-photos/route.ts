import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAuth } from '@/lib/with-auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const VINTED_CDN_PATTERNS = ['vinted.net', 'vinted.com']

function isVintedCdnUrl(url: string): boolean {
  return VINTED_CDN_PATTERNS.some((p) => url.includes(p))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function mirrorPhoto(photoUrl: string, index: number, userId: string, sku: string, adminClient: any): Promise<string | null> {
  try {
    if (!photoUrl || !photoUrl.startsWith('http')) return null

    const response = await fetch(photoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*',
      },
    })
    if (!response.ok) return null

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await response.arrayBuffer())

    let extension = 'jpg'
    if (contentType.includes('png')) extension = 'png'
    else if (contentType.includes('webp')) extension = 'webp'

    const filename = `${userId}/${sku}-${index}.${extension}`

    const { error } = await adminClient.storage
      .from('find-photos')
      .upload(filename, buffer, { contentType, cacheControl: '31536000', upsert: true })

    if (error) return null

    const { data } = adminClient.storage.from('find-photos').getPublicUrl(filename)
    return data.publicUrl
  } catch {
    return null
  }
}

/**
 * POST /api/import/mirror-photos
 * Body: { batch?: number }
 *
 * Mirrors Vinted CDN photo URLs → Supabase Storage for the user's oldest unmirrored finds.
 * Returns { mirrored, skipped, remaining } so the client can loop until remaining === 0.
 * Each call is designed to complete within Vercel's 60s function timeout (~30 finds × 5 photos).
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  const body = await request.json().catch(() => ({})) as { batch?: number }
  const batch = Math.min(body.batch ?? 30, 50) // cap at 50 to stay within 60s timeout

  const supabase = await createSupabaseServerClient()

  // Fetch finds that still have CDN URLs (Postgres filter on photos jsonb cast to text)
  const { data: finds } = await supabase
    .from('finds')
    .select('id, photos, sku')
    .eq('user_id', user.id)
    .or('photos.cs.["https://images1.vinted.net"],photos.cs.["https://images2.vinted.net"],photos.cs.["https://images3.vinted.net"],photos.cs.["https://images4.vinted.net"],photos.cs.["https://images5.vinted.net"]')
    .order('created_at', { ascending: true })
    .limit(batch)

  // Count total remaining (for progress display) — use a text search on the jsonb column
  const { count: remaining } = await supabase
    .from('finds')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .or('photos.cs.["https://images1.vinted.net"],photos.cs.["https://images2.vinted.net"],photos.cs.["https://images3.vinted.net"],photos.cs.["https://images4.vinted.net"],photos.cs.["https://images5.vinted.net"]')

  if (!finds?.length) return NextResponse.json({ mirrored: 0, skipped: 0, remaining: remaining ?? 0 })

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let mirrored = 0
  let skipped = 0

  // Process in parallel (all finds in this batch simultaneously)
  await Promise.all(finds.map(async (find) => {
    const photos: string[] = find.photos || []
    const needsMirroring = photos.some((url) => isVintedCdnUrl(url))
    if (!needsMirroring) { skipped++; return }

    const sku = find.sku || find.id
    const results = await Promise.all(
      photos.map((url, idx) =>
        isVintedCdnUrl(url)
          ? mirrorPhoto(url, idx, user.id, sku, adminClient)
          : Promise.resolve(url)
      )
    )

    const updated = results.map((r, idx) => r || photos[idx] || '')
    const anyMirrored = updated.some((u, idx) => u !== photos[idx] && !isVintedCdnUrl(u))

    if (anyMirrored) {
      await supabase.from('finds').update({ photos: updated }).eq('id', find.id)
      mirrored++
    } else {
      skipped++
    }
  }))

  // Recalculate remaining after this batch
  const { count: remainingAfter } = await supabase
    .from('finds')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .or('photos.cs.["https://images1.vinted.net"],photos.cs.["https://images2.vinted.net"],photos.cs.["https://images3.vinted.net"],photos.cs.["https://images4.vinted.net"],photos.cs.["https://images5.vinted.net"]')

  return NextResponse.json({ mirrored, skipped, remaining: remainingAfter ?? 0 })
})
