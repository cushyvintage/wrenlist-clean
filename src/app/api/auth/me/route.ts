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
      },
    })
  } catch {
    return NextResponse.json({ user: null }, { status: 401 })
  }
}
