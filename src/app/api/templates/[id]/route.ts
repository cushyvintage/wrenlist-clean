import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { CreateListingTemplateSchema, UpdateListingTemplateSchema, validateBody } from '@/lib/validation'

/**
 * GET /api/templates/[id]
 * Fetch a single template (with ownership check)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const { id } = await params

    const { data: template, error } = await supabase
      .from('listing_templates')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !template) {
      return ApiResponseHelper.notFound('Template not found')
    }

    return ApiResponseHelper.success(template)
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}

/**
 * PATCH /api/templates/[id]
 * Update a template (increment usage_count and/or edit fields)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const { id } = await params
    const body = await request.json()

    // Check ownership (scoped query)
    const { data: template, error: fetchError } = await supabase
      .from('listing_templates')
      .select('user_id, usage_count')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !template) {
      return ApiResponseHelper.notFound('Template not found')
    }

    // Validate update data
    const validation = validateBody(UpdateListingTemplateSchema, body)
    if (!validation.success) {
      return ApiResponseHelper.badRequest(validation.error)
    }

    // If no fields provided, increment usage_count (template applied)
    const updateData = validation.data.name
      ? { ...validation.data, updated_at: new Date().toISOString() }
      : { usage_count: (template.usage_count || 0) + 1, updated_at: new Date().toISOString() }

    const { data, error } = await supabase
      .from('listing_templates')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success(data)
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}

/**
 * PUT /api/templates/[id]
 * Update template (full or partial update with ownership check)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const { id } = await params
    const body = await request.json()

    // Check ownership (scoped query)
    const { data: template, error: fetchError } = await supabase
      .from('listing_templates')
      .select('user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !template) {
      return ApiResponseHelper.notFound('Template not found')
    }

    // Validate update data
    const validation = validateBody(UpdateListingTemplateSchema, body)
    if (!validation.success) {
      return ApiResponseHelper.badRequest(validation.error)
    }

    const updateData = {
      ...validation.data,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('listing_templates')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) {
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success(data)
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}

/**
 * DELETE /api/templates/[id]
 * Delete a template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const { id } = await params

    // Check ownership (scoped query)
    const { data: template, error: fetchError } = await supabase
      .from('listing_templates')
      .select('user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !template) {
      return ApiResponseHelper.notFound('Template not found')
    }

    const { error } = await supabase
      .from('listing_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success({ id })
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}
