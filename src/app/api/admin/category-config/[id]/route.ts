import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'

// Only allow admin user (dom@wrenlist.com)
const ADMIN_EMAIL = 'dom@wrenlist.com'

const ensureAdmin = async () => {
  const user = await getServerUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    throw new Error('Unauthorized')
  }
}

interface RouteContext {
  params: Promise<{ id: string }>
}

export const PATCH = async (
  req: NextRequest,
  context: RouteContext
) => {
  try {
    await ensureAdmin()

    const { id } = await context.params
    const body = await req.json()

    if (!body.fields || typeof body.fields !== 'object') {
      return NextResponse.json(
        { error: 'fields must be a valid object' },
        { status: 400 }
      )
    }

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

    if (error === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update category configuration' },
      { status: 500 }
    )
  }
}
