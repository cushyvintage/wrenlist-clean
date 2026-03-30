/**
 * GET /api/products - List all products for current user
 * POST /api/products - Create a new product
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { getProducts, createProduct, getProductStats } from '@/services/products.service'

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

    // Get products
    const products = await getProducts({
      status,
      search: search || undefined,
    })

    const response: any = { products }

    // Include stats if requested
    if (includeStats) {
      const stats = await getProductStats()
      response.stats = stats
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('GET /api/products error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/products
 * Create a new product
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
        { error: 'Product name is required' },
        { status: 400 }
      )
    }

    // Create product with user_id from auth
    const product = await createProduct({
      ...body,
      user_id: user.id,
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/products error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
