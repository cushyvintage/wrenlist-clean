import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAdminAuth } from '@/lib/with-auth'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST /api/admin/categories/suggestion-log
 *
 * Log a category suggestion acceptance, rejection, or override.
 *
 * Body: {
 *   categoryValue: string
 *   platform: string
 *   suggestedId?: string
 *   suggestedName?: string
 *   action: 'accepted' | 'rejected' | 'changed'
 *   finalId?: string
 *   finalName?: string
 *   source?: string  // 'auto_suggest' | 'ai_match' | 'taxonomy_search'
 * }
 */
export const POST = withAdminAuth(async (req) => {
  const body = await req.json()
  const {
    categoryValue,
    platform,
    suggestedId,
    suggestedName,
    action,
    finalId,
    finalName,
    source,
  } = body as {
    categoryValue?: string
    platform?: string
    suggestedId?: string
    suggestedName?: string
    action?: string
    finalId?: string
    finalName?: string
    source?: string
  }

  if (!categoryValue || !platform || !action) {
    return NextResponse.json(
      { error: 'categoryValue, platform, and action are required' },
      { status: 400 }
    )
  }

  if (!['accepted', 'rejected', 'changed'].includes(action)) {
    return NextResponse.json(
      { error: 'action must be accepted, rejected, or changed' },
      { status: 400 }
    )
  }

  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('category_suggestion_log')
    .insert({
      category_value: categoryValue,
      platform,
      suggested_id: suggestedId ?? null,
      suggested_name: suggestedName ?? null,
      action,
      final_id: finalId ?? null,
      final_name: finalName ?? null,
      source: source ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
})
