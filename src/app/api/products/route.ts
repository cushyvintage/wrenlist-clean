/**
 * GET /api/products - List all finds for current user (legacy endpoint, use /api/finds)
 * POST /api/products - Create a new find (legacy endpoint, use /api/finds)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { getFinds, createFind, getFindStats } from '@/services/products.service'

/**
 * GET /api/products
 * Query params:
 *   - status: draft | listed | on_hold | sold
 *   - search: search term
 *   - stats: true to include statistics
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as any
    const search = searchParams.get('search')
    const includeStats = searchParams.get('stats') === 'true'

    // Get finds
    const finds = await getFinds({
      status,
      search: search || undefined,
    })

    const response: any = { finds }

    // Include stats if requested
    if (includeStats) {
      const stats = await getFindStats()
      response.stats = stats
    }

    return NextResponse.json(response)
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('GET /api/products error:', error)
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/products
 * Create a new find (legacy endpoint, use /api/finds)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

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
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('POST /api/products error:', error)
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
