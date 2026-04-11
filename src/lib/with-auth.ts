import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerUser } from './supabase-server'
import { ApiResponseHelper } from './api-response'
import { isAdmin } from './admin'
import type { User } from '@supabase/supabase-js'

/**
 * Handler type for authenticated route
 * Receives request, authenticated user, and optional route params
 */
type AuthedHandler = (
  req: NextRequest,
  user: User,
  params?: Record<string, string>
) => Promise<NextResponse>

type RouteContext = { params: Promise<Record<string, string>> }

/**
 * Try to authenticate via Authorization: Bearer header.
 * Used by the Chrome extension's MV3 service worker which cannot send cookies.
 */
async function getUserFromBearerToken(req: NextRequest): Promise<User | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

/**
 * HOF wrapper for authenticated API routes.
 * Checks user auth via cookies first, then falls back to Authorization header.
 * Returns 401 if not authenticated.
 */
export function withAuth(handler: AuthedHandler) {
  return async (req: NextRequest, context: RouteContext) => {
    try {
      let user = await getServerUser()

      // Fallback: Bearer token from Authorization header (extension service worker)
      if (!user) {
        user = await getUserFromBearerToken(req)
      }

      if (!user) {
        return ApiResponseHelper.unauthorized()
      }

      const params = context?.params ? await context.params : undefined
      return await handler(req, user, params)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error'
      return ApiResponseHelper.error(message, 500)
    }
  }
}

/**
 * HOF wrapper for admin-only API routes.
 * Requires authentication AND membership in ADMIN_EMAILS (see src/lib/admin.ts).
 * Returns 401 if not authenticated, 403 if authenticated but not admin.
 */
export function withAdminAuth(handler: AuthedHandler) {
  return withAuth(async (req, user, params) => {
    if (!isAdmin(user.email)) {
      return ApiResponseHelper.forbidden()
    }
    return handler(req, user, params)
  })
}
