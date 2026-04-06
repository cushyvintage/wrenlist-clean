import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/auth/error?error=no_code', request.url))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      return NextResponse.redirect(
        new URL(`/auth/error?error=${encodeURIComponent(error.message)}`, request.url)
      )
    }

    // Get user to check verification and onboarding status
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Check if email is verified
      if (!user.email_confirmed_at) {
        // Not verified — show verify-email page
        const verifyUrl = new URL(`/verify-email?email=${encodeURIComponent(user.email || '')}`, request.url)
        return NextResponse.redirect(verifyUrl)
      }

      // Email is verified — check onboarding status
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .single()

      if (!profile?.onboarding_completed) {
        // Not completed onboarding — go to onboarding
        const onboardingUrl = new URL('/onboarding', request.url)
        return NextResponse.redirect(onboardingUrl)
      }
    }

    // Redirect to dashboard after successful auth
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const dashboardUrl = appUrl
      ? new URL('/dashboard', appUrl)
      : new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.redirect(
      new URL(`/auth/error?error=${encodeURIComponent(errorMessage)}`, request.url)
    )
  }
}
