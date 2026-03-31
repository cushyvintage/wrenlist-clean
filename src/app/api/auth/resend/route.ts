import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()

    // Resend verification email
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    })

    if (error) {
      if (process.env.NODE_ENV !== 'production') { console.error('Resend error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to resend verification email' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Verification email sent' },
      { status: 200 }
    )
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') { console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
