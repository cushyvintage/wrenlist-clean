import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 2 * 1024 * 1024 // 2MB

/** POST /api/profiles/me/avatar — upload avatar image and store on profile */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const form = await request.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return ApiResponseHelper.badRequest('Missing file')
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      return ApiResponseHelper.badRequest('Only JPEG, PNG, or WebP images allowed')
    }
    if (file.size > MAX_BYTES) {
      return ApiResponseHelper.badRequest('Image must be under 2MB')
    }

    const supabase = await createSupabaseServerClient()
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    // Path: {userId}/avatar.{ext} — RLS policies check first folder == auth.uid()
    const path = `${user.id}/avatar-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { contentType: file.type, upsert: true })

    if (uploadError) {
      return ApiResponseHelper.internalError(`Upload failed: ${uploadError.message}`)
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(path)
    const avatarUrl = publicUrlData.publicUrl

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('user_id', user.id)

    if (updateError) {
      return ApiResponseHelper.internalError(`Profile update failed: ${updateError.message}`)
    }

    return NextResponse.json({ success: true, data: { avatar_url: avatarUrl } })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return ApiResponseHelper.internalError(msg)
  }
})
