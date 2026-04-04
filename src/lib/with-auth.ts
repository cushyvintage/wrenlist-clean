import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from './supabase-server'
import { ApiResponseHelper } from './api-response'
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
 * HOF wrapper for authenticated API routes.
 * Checks user auth and injects user into handler.
 * Returns 401 if not authenticated.
 */
export function withAuth(handler: AuthedHandler) {
  return async (req: NextRequest, context: RouteContext) => {
    try {
      const user = await getServerUser()

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
