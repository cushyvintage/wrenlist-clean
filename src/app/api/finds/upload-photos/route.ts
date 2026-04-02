import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
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

    // Ensure bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    if (bucketsError) {
      return ApiResponseHelper.internalError()
    }

    const bucketExists = buckets?.some(b => b.name === 'find-photos')
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket('find-photos', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'],
      })
      if (createError) {
        return ApiResponseHelper.internalError()
      }
    }

    const uploadedUrls: string[] = []

    // Upload each photo
    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i]
      if (!file) continue
      const filename = `${Date.now()}-${i}-${file.name}`
      const path = `${user.id}/${findId}/${filename}`

      const { error: uploadError } = await supabase.storage
        .from('find-photos')
        .upload(path, file, {
          upsert: false,
          contentType: file.type,
        })

      if (uploadError) {
        // Continue uploading remaining files, but track any errors
        continue
      }

      // Get public URL
      const { data: publicData } = supabase.storage
        .from('find-photos')
        .getPublicUrl(path)

      uploadedUrls.push(publicData.publicUrl)
    }

    if (uploadedUrls.length === 0) {
      return ApiResponseHelper.badRequest('Failed to upload any photos')
    }

    return ApiResponseHelper.success({ urls: uploadedUrls })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('POST /api/finds/upload-photos error:', error)
    }
    return ApiResponseHelper.internalError()
  }
}
