import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * POST /api/finds/[id]/photos
 * Accepts base64-encoded photo data from the extension and uploads to Supabase Storage.
 * Body: { photos: Array<{ data: string (base64), ext: string, index: number }> }
 */
export const POST = (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) =>
  withAuth(async (_req, user) => {
    const supabase = await createSupabaseServerClient()
    const { id: findId } = await params

    // Verify find ownership
    const { data: find } = await supabase
      .from('finds')
      .select('id, sku')
      .eq('id', findId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!find) return ApiResponseHelper.notFound('Find not found')

    const body = await _req.json()
    const photos: Array<{ data: string; ext: string; index: number }> = body.photos || []

    if (!photos.length) return ApiResponseHelper.badRequest('No photos provided')

    const storedUrls: string[] = []

    for (const photo of photos) {
      try {
        const { data: base64, ext, index } = photo
        const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg'

        // Convert base64 to buffer
        const binaryStr = atob(base64)
        const bytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i)
        }

        const sku = find.sku || `find-${findId.slice(0, 8)}`
        const storagePath = `find-photos/${user.id}/${sku}-${index}.${safeExt}`

        const { error: uploadErr } = await supabase.storage
          .from('find-photos')
          .upload(storagePath, bytes, {
            contentType: `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`,
            upsert: true,
          })

        if (uploadErr) continue

        const { data: { publicUrl } } = supabase.storage.from('find-photos').getPublicUrl(storagePath)
        storedUrls.push(publicUrl)
      } catch {
        // Skip failed photos
      }
    }

    if (storedUrls.length > 0) {
      await supabase.from('finds').update({ photos: storedUrls }).eq('id', findId)
    }

    return ApiResponseHelper.success({ uploaded: storedUrls.length, urls: storedUrls })
  })(req, { params } as any)
