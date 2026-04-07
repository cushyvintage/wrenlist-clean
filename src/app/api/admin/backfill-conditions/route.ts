import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'

/**
 * POST /api/admin/backfill-conditions
 * One-off: migrate 'excellent' → 'new_without_tags'.
 * Uses authenticated user's session (RLS enforced).
 * DELETE THIS FILE after running.
 */
export const POST = withAuth(async (_req, _user) => {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('finds')
    .update({ condition: 'new_without_tags' })
    .eq('condition', 'excellent')
    .select('id, name, condition')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    message: `Backfilled ${data?.length ?? 0} finds: excellent → new_without_tags`,
    updated: data,
  })
})
