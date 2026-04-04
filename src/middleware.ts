import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const APP_SUBDOMAIN = 'app.wrenlist.com'
const MARKETING_DOMAIN = 'wrenlist.com'

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || ''
  const pathname = req.nextUrl.pathname
  const isAppSubdomain = hostname === APP_SUBDOMAIN
  const isMarketingDomain = hostname === MARKETING_DOMAIN || hostname === `www.${MARKETING_DOMAIN}`

  let res = NextResponse.next({ request: { headers: req.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Define public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/',
    '/landing',
    '/pricing',
    '/about',
    '/blog',
    '/story',
    '/roadmap',
  ]

  // Protected dashboard routes (require authentication)
  const dashboardRoutes = [
    '/onboarding',
    '/dashboard',
    '/inventory',
    '/add-find',
    '/listings',
    '/expenses',
    '/mileage',
    '/tax',
    '/analytics',
    '/orders',
    '/platform-connect',
    '/ai-listing',
    '/price-research',
    '/suppliers',
    '/finds',
    '/settings',
    '/sourcing',
    '/import',
    '/packaging',
    '/sku',
  ]

  // If user is not authenticated and trying to access protected routes
  const isProtectedRoute = dashboardRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))
  if (!session && isProtectedRoute) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (session && ['/login', '/register', '/forgot-password', '/reset-password'].some((route) => pathname.startsWith(route))) {
    const dashUrl = new URL('/dashboard', req.url)
    // If on marketing domain, redirect to app subdomain
    if (isMarketingDomain) {
      dashUrl.hostname = APP_SUBDOMAIN
      dashUrl.port = ''
    }
    return NextResponse.redirect(dashUrl)
  }

  // If user is authenticated and NOT on onboarding page, check if they've completed onboarding
  // Skip check for onboarding page itself, API routes, and static assets
  if (
    session &&
    !pathname.startsWith('/onboarding') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/auth') &&
    pathname !== '/favicon.ico'
  ) {
    try {
      // Fetch user profile to check onboarding_completed
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && anonKey) {
        const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${session.user.id}&select=onboarding_completed`, {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (profileRes.ok) {
          const profiles = await profileRes.json()
          if (profiles.length > 0) {
            const profile = profiles[0]
            // If onboarding not completed, redirect to onboarding page
            if (profile.onboarding_completed === false) {
              const onboardingUrl = new URL('/onboarding', req.url)
              return NextResponse.redirect(onboardingUrl)
            }
          }
        }
      }
    } catch (error) {
      // Log error but don't block navigation on fetch failures
      if (process.env.NODE_ENV !== 'production') {
        console.error('Onboarding check error:', error)
      }
    }
  }

  return res
}

// Specify which routes to apply middleware to
export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - auth/callback (OAuth callback — must reach route handler directly)
    '/((?!api|_next/static|_next/image|favicon.ico|auth/callback).*)',
  ],
}
