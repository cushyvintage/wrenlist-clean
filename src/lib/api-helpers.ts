import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { NextRequest, NextResponse } from 'next/server'
import type { User, SupabaseClient } from '@supabase/supabase-js'

/**
 * Handler function that receives auth context
 */
export type AuthedHandler = (
  req: NextRequest,
  user: User,
  supabase: SupabaseClient
) => Promise<NextResponse>

/**
 * Wraps API route handlers with auth checks
 *
 * Usage:
 *   export const POST = (req: NextRequest) =>
 *     withAuth(req, async (req, user, supabase) => {
 *       // user is guaranteed to exist
 *       // supabase is authenticated as the user
 *     })
 */
export async function withAuth(req: NextRequest, handler: AuthedHandler): Promise<NextResponse> {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    return await handler(req, user, supabase)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API Error]', msg)
    return ApiResponseHelper.internalError(msg)
  }
}
