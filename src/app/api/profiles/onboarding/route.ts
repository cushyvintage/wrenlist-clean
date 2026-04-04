import { withAuth } from '@/lib/api-helpers'
import { ApiResponseHelper } from '@/lib/api-response'
import { NextRequest } from 'next/server'

/**
 * PATCH /api/profiles/onboarding
 * Mark the current user's onboarding as complete
 */
export async function PATCH(req: NextRequest) {
  return withAuth(req, async (req, user, supabase) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        return ApiResponseHelper.internalError('Failed to update onboarding status')
      }

      return ApiResponseHelper.success(data)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      return ApiResponseHelper.internalError(msg)
    }
  })
}
