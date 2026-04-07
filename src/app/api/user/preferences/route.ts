import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export interface AIAutoFillPreferences {
  enabled: boolean
  title: boolean
  description: boolean
  category: boolean
  condition: boolean
  price: boolean
}

const DEFAULT_PREFERENCES: AIAutoFillPreferences = {
  enabled: true,
  title: true,
  description: true,
  category: true,
  condition: true,
  price: true,
}

/** GET /api/user/preferences — fetch AI auto-fill preferences */
export const GET = withAuth(async (_request, user) => {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('ai_autofill_preferences')
    .eq('id', user.id)
    .single()

  const prefs = (data?.ai_autofill_preferences as AIAutoFillPreferences | null) ?? DEFAULT_PREFERENCES
  return NextResponse.json(prefs)
})

/** PATCH /api/user/preferences — update AI auto-fill preferences */
export const PATCH = withAuth(async (request, user) => {
  const body = await request.json() as Partial<AIAutoFillPreferences>

  // Merge with defaults to ensure all fields present
  const supabase = await createSupabaseServerClient()
  const { data: existing } = await supabase
    .from('profiles')
    .select('ai_autofill_preferences')
    .eq('id', user.id)
    .single()

  const current = (existing?.ai_autofill_preferences as AIAutoFillPreferences | null) ?? DEFAULT_PREFERENCES
  const updated: AIAutoFillPreferences = { ...current, ...body }

  const { error } = await supabase
    .from('profiles')
    .update({ ai_autofill_preferences: updated })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updated)
})
