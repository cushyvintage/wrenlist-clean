import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const GET = withAuth(async (_req: NextRequest, user) => {
  const supabase = await createSupabaseServerClient()

  // Check Vinted connection
  const { data: connection } = await supabase
    .from('vinted_connections')
    .select('username')
    .eq('user_id', user.id)
    .maybeSingle()

  // Count existing finds
  const { count } = await supabase
    .from('finds')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)

  return ApiResponseHelper.success({
    connected: !!connection,
    username: connection?.username ?? null,
    existingCount: count ?? 0,
  })
})
