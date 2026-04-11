import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-auth'

export const GET = withAdminAuth(async (_req, _user) => {
  try {
    const { createSupabaseServerClient } = await import('@/lib/supabase-server')
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('marketplace_category_config')
      .select('*')
      .order('category')
      .order('marketplace')

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    console.error('Error fetching category configs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch category configurations' },
      { status: 500 }
    )
  }
})
