import { NextResponse } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'

export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // Fetch display name from profile (set during onboarding), fall back to Google metadata
    const supabase = await createSupabaseServerClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single()

    const full_name =
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      null

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        full_name,
      },
    })
  } catch (error) {
    const err = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ user: null, error: err }, { status: 401 })
  }
}
