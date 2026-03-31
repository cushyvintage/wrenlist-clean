import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Parse error message
      let message = error.message
      if (message.includes('Invalid login credentials')) {
        message = 'Invalid email or password'
      } else if (message.includes('Email not confirmed')) {
        message = 'Please verify your email before logging in'
      } else if (message.includes('Network')) {
        message = 'Network error. Please check your connection'
      }

      return NextResponse.json({ error: message }, { status: 401 })
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Login failed. Please try again.' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Login error:', error)
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
