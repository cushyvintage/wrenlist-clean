import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import type { ScanHistoryRecord } from '@/types'

// GET /api/scans — fetch user's scan history (newest first, limit 100)
export const GET = withAuth(async (req, user) => {
  const supabase = await createSupabaseServerClient()
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 200)

  const { data, error } = await supabase
    .from('scan_history')
    .select('id, barcode, title, category, brand, details, source, price_data, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('GET /api/scans error:', error)
    return ApiResponseHelper.internalError()
  }

  return ApiResponseHelper.success(data as ScanHistoryRecord[])
})

// POST /api/scans — save a scan result
export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const { barcode, title, category, brand, details, source, price_data } = body

  if (!barcode) {
    return ApiResponseHelper.badRequest('barcode is required')
  }

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('scan_history')
    .insert([{
      user_id: user.id,
      barcode,
      title: title || null,
      category: category || null,
      brand: brand || null,
      details: details || null,
      source: source || null,
      price_data: price_data || null,
    }])
    .select('id, barcode, title, category, brand, details, source, price_data, created_at')
    .single()

  if (error) {
    console.error('POST /api/scans error:', error)
    return ApiResponseHelper.internalError()
  }

  return ApiResponseHelper.created(data as ScanHistoryRecord)
})
