import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * GET /api/profile
 * Fetch the authenticated user's profile (singular endpoint)
 *
 * Response includes:
 * - All profile fields (id, plan, finds_this_month, etc.)
 * - finds_limit: derived from plan (free: 10, nester: 100, forager: 500, flock: null)
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
}
