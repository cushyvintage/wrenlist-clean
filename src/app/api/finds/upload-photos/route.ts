import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { ApiResponseHelper } from '@/lib/api-response'

interface UploadPhotoResponse {
  url: string
  path: string
}

/**
 * POST /api/finds/upload-photos
 * Upload photos for a find to Supabase Storage
 *
 * Request: multipart/form-data with:
 *   - find_id: UUID of the find
 *   - photos: array of File objects
 *
 * Response: { urls: string[] } — array of public URLs
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const formData = await request.formData()
    const findId = formData.get('find_id') as string
    const photoFiles = formData.getAll('photos') as File[]

    if (!findId) {
      return ApiResponseHelper.badRequest('find_id is required')
    }

    if (!photoFiles || photoFiles.length === 0) {
      return ApiResponseHelper.badRequest('No photos provided')
    }

    const supabase = await createSupabaseServerClient()

    // Verify find exists and belongs to authenticated user
    const { data: find, error: findError } = await supabase
      .from('finds')
      .select('id')
      .eq('id', findId)
      .eq('user_id', user.id)
      .single()

    if (findError || !find) {
      return ApiResponseHelper.notFound()
    }

    // Use service role client for storage operations (cookie client lacks storage admin perms)
    const storageClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const uploadedUrls: string[] = []
    const uploadErrors: string[] = []

    // Upload each photo
    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i]
      if (!file) continue
      const filename = `${Date.now()}-${i}-${file.name}`
      const path = `${user.id}/${findId}/${filename}`

      const { error: uploadError } = await storageClient.storage
        .from('find-photos')
        .upload(path, file, {
          upsert: false,
          contentType: file.type,
        })

      if (uploadError) {
        console.error('Photo upload error:', uploadError.message, path)
        uploadErrors.push(`${file.name}: ${uploadError.message}`)
        continue
      }

      // Get public URL
      const { data: publicData } = storageClient.storage
        .from('find-photos')
        .getPublicUrl(path)

      uploadedUrls.push(publicData.publicUrl)
    }

    if (uploadedUrls.length === 0) {
      const detail = uploadErrors.length > 0 ? ` (${uploadErrors[0]})` : ''
      return ApiResponseHelper.badRequest(`Failed to upload photos${detail}`)
    }

    return ApiResponseHelper.success({ urls: uploadedUrls })
  } catch (error) {
    console.error('POST /api/finds/upload-photos error:', error)
    const msg = error instanceof Error ? error.message : 'Upload failed'
    return ApiResponseHelper.internalError(msg)
  }
}
