import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * GET /api/profile
 * Fetch the authenticated user's profile (singular endpoint)
 *
 * Response includes:
 * - All profile fields (id, plan, finds_this_month, etc.)
 * - finds_limit: derived from plan (free: 10, nester: 100, forager: 500, flock: null)
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
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', error)
      }
      return ApiResponseHelper.notFound('Profile not found')
    }

    // Add finds_limit based on plan
    const planLimits: Record<string, number | null> = {
      free: 10,
      nester: 100,
      forager: 500,
      flock: null,
    }

    const enrichedData = {
      ...data,
      finds_limit: planLimits[data.plan] ?? null,
    }

    return ApiResponseHelper.success({ data: enrichedData })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('GET /api/profile error:', error)
    }
    return ApiResponseHelper.internalError()
  }
})
