/**
 * GET /api/products/[id] - Get a single product
 * PUT /api/products/[id] - Update a product
 * DELETE /api/products/[id] - Delete a product
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase, validateSupabaseConfig } from '@/services/supabase'
import { getProduct, updateProduct, deleteProduct } from '@/services/products.service'

type RouteParams = Promise<{ id: string }>

/**
 * GET /api/products/[id]
 */
export async function GET(request: NextRequest, { params }: { params: RouteParams }) {
  const { id } = await params
  try {
    validateSupabaseConfig()

    const user = await supabase.auth.getUser()
    if (!user.data?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const product = await getProduct(id)

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (product.user_id !== user.data.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    return NextResponse.json({ product })
  } catch (error: any) {
    console.error(`GET /api/products/${id} error:`, error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/products/[id]
 */
export async function PUT(request: NextRequest, { params }: { params: RouteParams }) {
  const { id } = await params
  try {
    validateSupabaseConfig()

    const user = await supabase.auth.getUser()
    if (!user.data?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership first
    const product = await getProduct(id)
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.user_id !== user.data.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const updated = await updateProduct(id, body)

    return NextResponse.json({ product: updated })
  } catch (error: any) {
    console.error(`PUT /api/products/${id} error:`, error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/products/[id]
 */
export async function DELETE(request: NextRequest, { params }: { params: RouteParams }) {
  const { id } = await params
  try {
    validateSupabaseConfig()

    const user = await supabase.auth.getUser()
    if (!user.data?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership first
    const product = await getProduct(id)
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.user_id !== user.data.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    await deleteProduct(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error(`DELETE /api/products/${id} error:`, error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
