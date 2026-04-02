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

export const GET = async (req: NextRequest) => {
  try {
    await ensureAdmin()

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

    if (error === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch category configurations' },
      { status: 500 }
    )
  }
}
