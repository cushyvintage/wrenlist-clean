import { withAuth } from '@/lib/api-helpers'
import { ApiResponseHelper } from '@/lib/api-response'
import { UpdateProfileSchema, validateBody } from '@/lib/validation'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user, supabase) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, plan, stripe_customer_id, finds_this_month, business_name, phone, address, avatar_url')
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

      // Validate format/length before touching the DB. Previously this
      // route trusted any input — that's how strings like phone="555"
      // and 1MB-long full_names could land in production rows.
      const validation = validateBody(UpdateProfileSchema, body)
      if (!validation.success) {
        return ApiResponseHelper.badRequest(validation.error)
      }
      const { full_name, business_name, phone, address, avatar_url } = validation.data

      // Build update object with only provided fields
      const updates: Record<string, string | null> = {}
      if (full_name !== undefined) updates.full_name = full_name ?? null
      if (business_name !== undefined) updates.business_name = business_name ?? null
      if (phone !== undefined) updates.phone = phone ?? null
      if (address !== undefined) updates.address = address ?? null
      if (avatar_url !== undefined) updates.avatar_url = avatar_url ?? null

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
