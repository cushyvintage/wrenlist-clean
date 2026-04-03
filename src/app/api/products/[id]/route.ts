/**
 * GET /api/products/[id] - Get a single find (legacy endpoint, use /api/finds/[id])
 * PUT /api/products/[id] - Update a find (legacy endpoint, use /api/finds/[id])
 * DELETE /api/products/[id] - Delete a find (legacy endpoint, use /api/finds/[id])
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { getFind, updateFind, deleteFind } from '@/services/products.service'

type RouteParams = Promise<{ id: string }>

/**
 * GET /api/products/[id]
 */
export async function GET(request: NextRequest, { params }: { params: RouteParams }) {
  const { id } = await params
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const find = await getFind(id, user.id)

    if (!find) {
      return NextResponse.json(
        { error: 'Find not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ find })
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`GET /api/products/${id} error:`, error)
    }
    return NextResponse.json(
      { error: 'Internal server error' },
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
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership first (scoped query)
    const find = await getFind(id, user.id)
    if (!find) {
      return NextResponse.json(
        { error: 'Find not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const updated = await updateFind(id, user.id, body)

    return NextResponse.json({ find: updated })
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`PUT /api/products/${id} error:`, error)
    }
    return NextResponse.json(
      { error: 'Internal server error' },
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
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership first (scoped query)
    const find = await getFind(id, user.id)
    if (!find) {
      return NextResponse.json(
        { error: 'Find not found' },
        { status: 404 }
      )
    }

    await deleteFind(id, user.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`DELETE /api/products/${id} error:`, error)
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
