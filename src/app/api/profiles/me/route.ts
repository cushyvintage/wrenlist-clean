import { withAuth } from '@/lib/api-helpers'
import { ApiResponseHelper } from '@/lib/api-response'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user, supabase) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('plan, stripe_customer_id, finds_this_month')
        .eq('user_id', user.id)
        .single()

      if (error) {
        return ApiResponseHelper.internalError('Failed to fetch profile')
      }

      return ApiResponseHelper.success(profile)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      if (process.env.NODE_ENV !== 'production') {
        console.error('[API Error]', msg)
      }
      return ApiResponseHelper.internalError(msg)
    }
  })
}
