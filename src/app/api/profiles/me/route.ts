import { withAuth } from '@/lib/api-helpers'
import { ApiResponseHelper } from '@/lib/api-response'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user, supabase) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, plan, stripe_customer_id, finds_this_month, business_name, phone, address')
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

export async function PATCH(request: NextRequest) {
  return withAuth(request, async (req, user, supabase) => {
    try {
      const body = await request.json()
      const { full_name, business_name, phone, address } = body

      // Build update object with only provided fields
      const updates: Record<string, string> = {}
      if (full_name !== undefined) updates.full_name = full_name
      if (business_name !== undefined) updates.business_name = business_name
      if (phone !== undefined) updates.phone = phone
      if (address !== undefined) updates.address = address

      const { data: profile, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        return ApiResponseHelper.internalError('Failed to update profile')
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
