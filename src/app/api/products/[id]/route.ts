/**
 * GET /api/products/[id] - Get a single find (legacy endpoint, use /api/finds/[id])
 * PUT /api/products/[id] - Update a find (legacy endpoint, use /api/finds/[id])
 * DELETE /api/products/[id] - Delete a find (legacy endpoint, use /api/finds/[id])
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { getFind, updateFind, deleteFind } from '@/services/products.service'

export const GET = withAuth(async (req, user, params) => {
  const id = params!.id as string

  const find = await getFind(id, user.id)
  if (!find) {
    return NextResponse.json({ error: 'Find not found' }, { status: 404 })
  }

  return NextResponse.json({ find })
})

export const PUT = withAuth(async (req, user, params) => {
  const id = params!.id as string

  const find = await getFind(id, user.id)
  if (!find) {
    return NextResponse.json({ error: 'Find not found' }, { status: 404 })
  }

  const body = await req.json()
  const updated = await updateFind(id, user.id, body)

  return NextResponse.json({ find: updated })
})

export const DELETE = withAuth(async (req, user, params) => {
  const id = params!.id as string

  const find = await getFind(id, user.id)
  if (!find) {
    return NextResponse.json({ error: 'Find not found' }, { status: 404 })
  }

  await deleteFind(id, user.id)

  return NextResponse.json({ success: true })
})
