import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * GET /api/profile
 * Fetch the authenticated user's profile (singular endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', error)
      }
      return ApiResponseHelper.notFound('Profile not found')
    }

    return ApiResponseHelper.success({ data })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('GET /api/profile error:', error)
    }
    return ApiResponseHelper.internalError()
  }
}
