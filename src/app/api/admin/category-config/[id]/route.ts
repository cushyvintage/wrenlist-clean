import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'

export const PATCH = withAuth(async (req, user, params) => {
  const adminUserId = process.env.ADMIN_USER_ID
  if (!adminUserId || user.id !== adminUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const body = await req.json()

    if (!body.fields || typeof body.fields !== 'object') {
      return NextResponse.json(
        { error: 'fields must be a valid object' },
        { status: 400 }
      )
    }

    const { createSupabaseServerClient } = await import('@/lib/supabase-server')
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('marketplace_category_config')
      .update({
        fields: body.fields,
        last_updated: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    console.error('Error updating category config:', error)
    return NextResponse.json(
      { error: 'Failed to update category configuration' },
      { status: 500 }
    )
  }
})
