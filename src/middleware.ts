import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin'

const APP_SUBDOMAIN = process.env.NEXT_PUBLIC_APP_HOSTNAME || 'app.wrenlist.com'
const MARKETING_DOMAIN = process.env.NEXT_PUBLIC_MARKETING_HOSTNAME || 'wrenlist.com'

// Denylist model: everything is protected EXCEPT these public route prefixes.
// Any new page under (dashboard) is automatically gated without a middleware update.
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/goodbye',
  '/landing',
  '/pricing',
  '/about',
  '/blog',
  '/story',
  '/roadmap',
  '/privacy',
  '/terms',
  '/calculator',
  '/extension',
  '/glossary',
  '/marketplace-comparison',
  '/tax-estimator',
  '/auth',
] as const

const AUTH_PAGE_PREFIXES = ['/login', '/register', '/forgot-password', '/reset-password'] as const

function matchesPrefix(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(route + '/')
}

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || ''
  const pathname = req.nextUrl.pathname
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

  // Refresh session if expired.
  // If session fetch errors, we fall through with session=null — the denylist
  // check below will then fail closed for protected routes (redirect to /login)
  // and still allow public routes through.
  let session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] = null
  try {
    const { data } = await supabase.auth.getSession()
    session = data.session
  } catch {
    session = null
  }

  const isPublicRoute = PUBLIC_ROUTES.some((route) => matchesPrefix(pathname, route))

  // Auth pages live on app.wrenlist.com. If an unauthenticated visitor lands
  // on an auth route via the marketing domain (wrenlist.com/register,
  // /login, etc.) redirect to the app subdomain so there's one canonical
  // URL per flow. Keeps analytics, cookies and password manager entries
  // consolidated on one host.
  if (
    isMarketingDomain &&
    !session &&
    AUTH_PAGE_PREFIXES.some((route) => matchesPrefix(pathname, route))
  ) {
    const appUrl = new URL(pathname + req.nextUrl.search, req.url)
    appUrl.hostname = APP_SUBDOMAIN
    appUrl.port = ''
    return NextResponse.redirect(appUrl)
  }

  if (!session && !isPublicRoute) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // Admin-only routes: /admin/*, /testing — redirect non-admins to /dashboard.
  // Client-side gates on these pages exist too, but server-side enforcement
  // prevents the page shell from rendering at all.
  if (
    session &&
    (pathname.startsWith('/admin') || pathname === '/testing' || pathname.startsWith('/testing/')) &&
    !isAdmin(session.user.email)
  ) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (session && AUTH_PAGE_PREFIXES.some((route) => matchesPrefix(pathname, route))) {
    const dashUrl = new URL('/dashboard', req.url)
    // If on marketing domain, redirect to app subdomain
    if (isMarketingDomain) {
      dashUrl.hostname = APP_SUBDOMAIN
      dashUrl.port = ''
    }
    return NextResponse.redirect(dashUrl)
  }

  // If user is authenticated and lands on the root URL (which now server-renders
  // the marketing landing page rather than client-redirecting), kick them to
  // their dashboard so they don't see the marketing site by accident. Done at
  // the edge so no HTML is sent.
  if (session && pathname === '/') {
    const dashUrl = new URL('/dashboard', req.url)
    if (isMarketingDomain) {
      dashUrl.hostname = APP_SUBDOMAIN
      dashUrl.port = ''
    }
    return NextResponse.redirect(dashUrl)
  }

  // If user is authenticated and NOT on onboarding/public pages, check onboarding status.
  //
  // Caching: once a user completes onboarding we set a cookie `wl_onboarded=<userId>`.
  // On subsequent requests, if the cookie is present AND matches the current session
  // user id, we skip the Supabase fetch entirely. This turns an extra network round-trip
  // on every page load into a zero-cost cookie read after the first hit.
  if (session && !pathname.startsWith('/onboarding') && !isPublicRoute) {
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
              // skip this whole branch on subsequent requests.
              // TTL bounded to 1 hour so a deleted user with a still-valid
              // JWT can't ghost the safety net longer than the JWT itself
              // would naturally survive. The cache only exists to avoid
              // refetching the profile on every page view within a session.
              res.cookies.set('wl_onboarded', session.user.id, {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                maxAge: 60 * 60, // 1 hour
              })
            } else {
              // No profile row for this session → auth.users was deleted
              // (profile FK cascades, so absence of profile means absence of
              // user). Cookie is still JWT-valid so getSession() didn't flag
              // it, but rendering any authenticated page would show a
              // zombie "Good morning, There / User" state. Force sign-out.
              const loginUrl = new URL('/login', req.url)
              const redirect = NextResponse.redirect(loginUrl)
              if (cachedUserId) redirect.cookies.delete('wl_onboarded')
              // Clear every Supabase auth cookie — their names include the
              // project ref so we match by prefix.
              for (const c of req.cookies.getAll()) {
                if (c.name.startsWith('sb-') && c.name.includes('auth')) {
                  redirect.cookies.delete(c.name)
                }
              }
              return redirect
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
    // - robots.txt, sitemap.xml, manifest.json (SEO/PWA — must be publicly crawlable)
    // - Any path containing a dot (static assets in /public: logos, images, fonts, etc.)
    //   Without this, the denylist model below redirects unauthenticated requests for
    //   /wrenlist-logo.png to /login, which breaks the nav logo AND email logos (email
    //   clients fetch images unauthenticated).
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|auth/callback|.*\\..*).*)',
  ],
}
