import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * GET /api/profiles
 * Fetch the authenticated user's profile
 */
export const GET = withAuth(async (_req, user) => {
  try {
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (process.env.NODE_ENV !== 'production')  { console.error('Supabase error:', error) }      return ApiResponseHelper.notFound('Profile not found')
    }

    return ApiResponseHelper.success({ data })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production')  { console.error('GET /api/profiles error:', error) }    return ApiResponseHelper.internalError()
  }
})

/**
 * PATCH /api/profiles
 * Update the authenticated user's profile
 */
export const PATCH = withAuth(async (req, user) => {
  try {
    const body = await req.json()
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('profiles')
      .update(body)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) {
      if (process.env.NODE_ENV !== 'production')  { console.error('Supabase error:', error) }      return ApiResponseHelper.internalError('Failed to update profile')
    }

    return ApiResponseHelper.success({ data })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production')  { console.error('PATCH /api/profiles error:', error) }    return ApiResponseHelper.internalError()
  }
})
