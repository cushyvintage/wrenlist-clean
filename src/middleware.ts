import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const APP_SUBDOMAIN = process.env.NEXT_PUBLIC_APP_HOSTNAME || 'app.wrenlist.com'
const MARKETING_DOMAIN = process.env.NEXT_PUBLIC_MARKETING_HOSTNAME || 'wrenlist.com'

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
  let session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] = null
  try {
    const { data } = await supabase.auth.getSession()
    session = data.session
  } catch {
    // If session fetch fails, allow request through (fail open)
    return res
  }

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
    '/finds',
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
    '/billing',
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
  //
  // Caching: once a user completes onboarding we set a cookie `wl_onboarded=<userId>`.
  // On subsequent requests, if the cookie is present AND matches the current session
  // user id, we skip the Supabase fetch entirely. This turns an extra network round-trip
  // on every page load into a zero-cost cookie read after the first hit.
  if (
    session &&
    !pathname.startsWith('/onboarding') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/auth') &&
    pathname !== '/favicon.ico'
  ) {
    const cachedUserId = req.cookies.get('wl_onboarded')?.value
    const cacheIsValid = cachedUserId && cachedUserId === session.user.id

    if (!cacheIsValid) {
      try {
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
              if (profile.onboarding_completed === false) {
                // Clear any stale cache cookie then redirect
                const onboardingUrl = new URL('/onboarding', req.url)
                const redirect = NextResponse.redirect(onboardingUrl)
                if (cachedUserId) redirect.cookies.delete('wl_onboarded')
                return redirect
              }

              // onboarding_completed is true — set the cache cookie so we can
              // skip this whole branch on subsequent requests
              res.cookies.set('wl_onboarded', session.user.id, {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                maxAge: 60 * 60 * 24 * 30, // 30 days
              })
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
  }

  // If a user signs out, clear the onboarding cache cookie — otherwise the next
  // user on the same browser inherits a stale value. We detect "signed out" as
  // "no session but the cookie is present".
  if (!session && req.cookies.get('wl_onboarded')) {
    res.cookies.delete('wl_onboarded')
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
