import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerUser } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin'

/**
 * GET /api/admin/waitlist
 *
 * Admin-only endpoint. Fetches waitlist signups with pagination.
 * Query params: page (default 1), limit (default 50, max 500)
 * Response: { signups, total, page, limit } | { error }
 */

interface WaitlistSignup {
  id: string
  email: string
  name: string
  platforms: string[]
  pain_point: string | null
  business_stage: string | null
  scale: string | null
  blocker: string | null
  referral_code: string
  referral_count: number
  source: 'landing' | 'referral'
  created_at: string
  ip_address: string | null
}

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || !isAdmin(user.email)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 },
      )
    }

    const url = new URL(request.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get('limit') || '50')))

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500 },
      )
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    // Get total count
    const { count, error: countError } = await admin
      .from('waiting_list')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      throw countError
    }

    const total = count || 0
    const offset = (page - 1) * limit

    // Fetch paginated signups, sorted by newest first
    const { data: signups, error } = await admin
      .from('waiting_list')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    return NextResponse.json({
      signups: (signups || []) as WaitlistSignup[],
      total,
      page,
      limit,
    })
  } catch (err) {
    console.error('[admin/waitlist]', err)
    return NextResponse.json(
      { error: 'Failed to fetch waitlist' },
      { status: 500 },
    )
  }
}
