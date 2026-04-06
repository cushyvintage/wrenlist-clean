/**
 * GET /api/products - List all finds for current user (legacy endpoint, use /api/finds)
 * POST /api/products - Create a new find (legacy endpoint, use /api/finds)
 */

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { getFinds, createFind, getFindStats } from '@/services/products.service'
import type { Find, FindStatus } from '@/types'

/**
 * GET /api/products
 * Query params:
 *   - status: draft | listed | on_hold | sold
 *   - search: search term
 *   - stats: true to include statistics
 */
export const GET = withAuth(async (req, user) => {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') as FindStatus | 'all' | null
    const search = searchParams.get('search')
    const includeStats = searchParams.get('stats') === 'true'

    // Get finds (scoped to authenticated user)
    const finds = await getFinds(user.id, {
      status: status || undefined,
      search: search || undefined,
    })

    const response: { finds: Find[]; stats?: Awaited<ReturnType<typeof getFindStats>> } = { finds }

    // Include stats if requested (scoped to authenticated user)
    if (includeStats) {
      const stats = await getFindStats(user.id)
      response.stats = stats
    }

    return NextResponse.json(response)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('GET /api/products error:', error)
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

/**
 * POST /api/products
 * Create a new find (legacy endpoint, use /api/finds)
 */
export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Find name is required' },
        { status: 400 }
      )
    }

    // Create find with user_id from auth
    const find = await createFind({
      ...body,
      user_id: user.id,
    })

    return NextResponse.json({ find }, { status: 201 })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('POST /api/products error:', error)
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
