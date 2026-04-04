import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'

export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      },
    })
  } catch (error) {
    const err = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ user: null, error: err }, { status: 401 })
  }
}
