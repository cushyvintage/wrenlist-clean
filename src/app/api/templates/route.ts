import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { CreateListingTemplateSchema, validateBody } from '@/lib/validation'

/**
 * GET /api/templates
 * Fetch all templates for the authenticated user
 */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('listing_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success(data || [])
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}

/**
 * POST /api/templates
 * Create a new template from current form state
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    // Validate request body
    const validation = validateBody(CreateListingTemplateSchema, body)
    if (!validation.success) {
      return ApiResponseHelper.badRequest(validation.error)
    }

    const template = {
      user_id: user.id,
      ...validation.data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('listing_templates')
      .insert([template])
      .select('*')
      .single()

    if (error) {
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.created(data)
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}
