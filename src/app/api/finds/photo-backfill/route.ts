import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * POST /api/finds/photo-backfill
 * Called by the extension to mirror Vinted photo URLs into Supabase Storage.
 * Body: { finds: Array<{ findId: string, photos: string[] }> }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return ApiResponseHelper.unauthorized()

    const supabase = await createSupabaseServerClient()
    const { finds } = await request.json()

    if (!Array.isArray(finds) || finds.length === 0) {
      return ApiResponseHelper.badRequest('No finds provided')
    }

    let updated = 0
    let skipped = 0

    for (const { findId, photos: rawUrls } of finds) {
      if (!findId || !rawUrls?.length) { skipped++; continue }

      // Only backfill finds that belong to this user and have no photos
      const { data: find } = await supabase
        .from('finds')
        .select('id, user_id, sku, category, photos')
        .eq('id', findId)
        .eq('user_id', user.id)
        .single()

      if (!find) { skipped++; continue }
      if (find.photos && find.photos.length > 0) { skipped++; continue }

      const sku = find.sku || `find-${findId.slice(0, 8)}`
      const storedUrls: string[] = []

      for (let i = 0; i < Math.min(rawUrls.length, 5); i++) {
        const photoUrl = rawUrls[i]
        try {
          const imgRes = await fetch(photoUrl)
          if (!imgRes.ok) { storedUrls.push(photoUrl); continue }
          const buffer = await imgRes.arrayBuffer()
          const ext = photoUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg'
          const path = `find-photos/${user.id}/${sku}-${i}.${ext}`

          const { error: uploadErr } = await supabase.storage
            .from('find-photos')
            .upload(path, buffer, {
              contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
              upsert: true,
            })

          if (uploadErr) { storedUrls.push(photoUrl); continue }

          const { data: { publicUrl } } = supabase.storage
            .from('find-photos')
            .getPublicUrl(path)

          storedUrls.push(publicUrl)
        } catch {
          storedUrls.push(photoUrl) // fallback to original
        }
      }

      if (storedUrls.length > 0) {
        await supabase
          .from('finds')
          .update({ photos: storedUrls, updated_at: new Date().toISOString() })
          .eq('id', findId)
        updated++
      }
    }

    return ApiResponseHelper.success({ updated, skipped })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Backfill failed'
    return ApiResponseHelper.internalError(message)
  }
}
