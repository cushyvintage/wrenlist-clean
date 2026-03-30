import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
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

  const pathname = req.nextUrl.pathname

  // Check if the current route is public
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // If user is not authenticated and trying to access protected routes
  if (!session && pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (session && ['/login', '/register', '/forgot-password', '/reset-password'].some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/app/dashboard', req.url))
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
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
